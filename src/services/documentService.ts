import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { auditService } from './auditService';

export type DocumentType =
  | 'INSTRUMENT_PHOTO'
  | 'NAMEPLATE_PHOTO'
  | 'TECHNICAL_DATASHEET'
  | 'USER_MANUAL'
  | 'PREVIOUS_CERTIFICATE'
  | 'TEST_EVIDENCE'
  | 'CALIBRATION_WEIGHT_CERTIFICATE'
  | 'LAB_SUPPORTING_DOCUMENT'
  | 'OTHER';

export interface DocumentRecord {
  id: string;
  instrumentId?: string;
  sessionId?: string;
  sessionTestId?: string;
  documentType: DocumentType;
  fileName: string;
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  description?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  uploadedAt: string;
  signedUrl?: string;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export const documentService = {
  /**
   * Validates file format and size
   */
  validateFile(file: File): string | null {
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isDoc = ALLOWED_DOC_TYPES.includes(file.type);

    if (!isImage && !isDoc) {
      return 'Unsupported file type. Allowed formats: JPG, PNG, WEBP, PDF, DOCX.';
    }

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return 'File exceeds maximum allowed size (10 MB for images).';
    }

    if (isDoc && file.size > MAX_PDF_SIZE) {
      return 'File exceeds maximum allowed size (20 MB for PDFs).';
    }

    return null;
  },

  /**
   * Upload file to Supabase Storage & insert record into documents table
   */
  async uploadDocument(params: {
    file: File;
    documentType: DocumentType;
    instrumentId?: string;
    sessionId?: string;
    sessionTestId?: string;
    moduleKey?: string;
    description?: string;
    userProfile?: { id: string; name?: string; fullName?: string; role: string };
  }): Promise<DocumentRecord> {
    const errorMsg = this.validateFile(params.file);
    if (errorMsg) {
      throw new Error(errorMsg);
    }

    const file = params.file;
    const bucket = params.sessionId ? 'test-evidence' : 'instrument-documents';
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    let storagePath = '';
    if (params.sessionId) {
      const moduleFolder = params.moduleKey || 'general';
      storagePath = `sessions/${params.sessionId}/${moduleFolder}/${cleanFileName}`;
    } else if (params.instrumentId) {
      const categoryFolder = params.documentType.toLowerCase();
      storagePath = `instruments/${params.instrumentId}/${categoryFolder}/${cleanFileName}`;
    } else {
      storagePath = `general/${cleanFileName}`;
    }

    let publicOrSignedUrl = '';

    // Upload to Supabase Storage if configured
    if (isSupabaseConfigured() && supabase) {
      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadErr) {
        throw new Error(`Upload failed. Please retry. (${uploadErr.message})`);
      }

      // Generate signed URL (expires in 1 hour)
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600);

      publicOrSignedUrl = urlData?.signedUrl || '';

      // Insert record into documents table
      const { data: docData, error: dbErr } = await supabase
        .from('documents')
        .insert({
          instrument_id: params.instrumentId,
          session_id: params.sessionId,
          session_test_id: params.sessionTestId,
          document_type: params.documentType,
          file_name: file.name,
          storage_bucket: bucket,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          description: params.description || `Uploaded ${params.documentType.toLowerCase().replace('_', ' ')}`,
          uploaded_by: params.userProfile?.id,
        })
        .select('*, profiles(full_name)')
        .single();

      if (dbErr) {
        console.warn('Document uploaded to storage but metadata record failed:', dbErr);
      }

      // Log Audit Event
      await auditService.logAuditEvent({
        userId: params.userProfile?.id,
        sessionId: params.sessionId,
        instrumentId: params.instrumentId,
        action: params.documentType === 'TEST_EVIDENCE' ? 'Evidence Added' : 'Document Uploaded',
        entityType: 'DOCUMENT',
        entityId: docData?.id,
        details: `Uploaded ${file.name} (${(file.size / 1024).toFixed(1)} KB) to ${bucket}`,
        userFullName: params.userProfile?.name,
        userRole: params.userProfile?.role,
      });

      return {
        id: docData?.id || `doc-${Date.now()}`,
        instrumentId: params.instrumentId,
        sessionId: params.sessionId,
        sessionTestId: params.sessionTestId,
        documentType: params.documentType,
        fileName: file.name,
        storageBucket: bucket,
        storagePath: storagePath,
        mimeType: file.type,
        fileSize: file.size,
        description: params.description,
        uploadedBy: params.userProfile?.id,
        uploadedByName: params.userProfile?.name || 'Testing Officer',
        uploadedAt: new Date().toISOString(),
        signedUrl: publicOrSignedUrl || URL.createObjectURL(file),
      };
    }

    // Local Fallback mode: create object URL for local preview
    const localUrl = URL.createObjectURL(file);
    const mockDoc: DocumentRecord = {
      id: `doc-${Date.now()}`,
      instrumentId: params.instrumentId,
      sessionId: params.sessionId,
      sessionTestId: params.sessionTestId,
      documentType: params.documentType,
      fileName: file.name,
      storageBucket: bucket,
      storagePath: storagePath,
      mimeType: file.type,
      fileSize: file.size,
      description: params.description,
      uploadedByName: params.userProfile?.name || 'Dr. Ananya Rao',
      uploadedAt: new Date().toISOString(),
      signedUrl: localUrl,
    };

    // Log Local Audit Event
    await auditService.logAuditEvent({
      userId: params.userProfile?.id,
      sessionId: params.sessionId,
      instrumentId: params.instrumentId,
      action: params.documentType === 'TEST_EVIDENCE' ? 'Evidence Added' : 'Document Uploaded',
      entityType: 'DOCUMENT',
      entityId: mockDoc.id,
      details: `Uploaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      userFullName: params.userProfile?.name,
      userRole: params.userProfile?.role,
    });

    return mockDoc;
  },

  /**
   * Fetch documents for instrument or session
   */
  async getDocuments(params: { instrumentId?: string; sessionId?: string }): Promise<DocumentRecord[]> {
    if (isSupabaseConfigured() && supabase) {
      let query = supabase.from('documents').select('*, profiles(full_name)');
      if (params.sessionId) {
        query = query.eq('session_id', params.sessionId);
      } else if (params.instrumentId) {
        query = query.eq('instrument_id', params.instrumentId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        const docsWithUrls = await Promise.all(
          data.map(async (row) => {
            let signedUrl = '';
            try {
              const { data: urlData } = await supabase!.storage
                .from(row.storage_bucket)
                .createSignedUrl(row.storage_path, 3600);
              signedUrl = urlData?.signedUrl || '';
            } catch {
              // fallback
            }

            return {
              id: row.id,
              instrumentId: row.instrument_id,
              sessionId: row.session_id,
              sessionTestId: row.session_test_id,
              documentType: row.document_type as DocumentType,
              fileName: row.file_name,
              storageBucket: row.storage_bucket,
              storagePath: row.storage_path,
              mimeType: row.mime_type,
              fileSize: Number(row.file_size),
              description: row.description,
              uploadedBy: row.uploaded_by,
              uploadedByName: row.profiles?.full_name || 'Testing Officer',
              uploadedAt: row.uploaded_at,
              signedUrl,
            };
          })
        );
        return docsWithUrls;
      }
    }

    return [];
  },

  /**
   * Delete document
   */
  async deleteDocument(doc: DocumentRecord, userProfile?: { id: string; name?: string; fullName?: string; role: string }): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      await supabase.storage.from(doc.storageBucket).remove([doc.storagePath]);
      await supabase.from('documents').delete().eq('id', doc.id);
    }

    await auditService.logAuditEvent({
      userId: userProfile?.id,
      sessionId: doc.sessionId,
      instrumentId: doc.instrumentId,
      action: 'Document Removed',
      entityType: 'DOCUMENT',
      entityId: doc.id,
      details: `Removed document ${doc.fileName}`,
      userFullName: userProfile?.name,
      userRole: userProfile?.role,
    });

    return true;
  },
};
