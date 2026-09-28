export enum Flag {
  // Genericos
  SUCCESS = 'success',
  ERROR = 'error',
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  VALIDATION_ERROR = 'validation_error',
  DATABASE_ERROR = 'database_error',
  PRECONDITION_FAILED = 'precondition_failed',
  NOT_IMPLEMENTED = 'not_implemented',

  // Autenticacion y usuarios
  USER_CREATED = 'user_created',
  LOGIN_SUCCESS = 'login_success',
  REGISTER_SUCCESS = 'register_success',
  PASSWORD_MISMATCH = 'password_mismatch',
  USER_NOT_FOUND = 'user_not_found',
  INVALID_CREDENTIALS = 'invalid_credentials',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  INVALID_TOKEN = 'invalid_token',
  TOKEN_EXPIRED = 'token_expired',

  // Dominio CRMIA
  CLIENT_CREATED = 'client_created',
  CLIENT_STAGE_MOVED = 'client_stage_moved',
  PROPERTY_CREATED = 'property_created',
  CONTRACT_GENERATED = 'contract_generated',
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_SIGNED = 'document_signed',
  INVOICE_ISSUED = 'invoice_issued',
  ASSISTANT_ACTION_EXECUTED = 'assistant_action_executed',
  ASSISTANT_ACTION_UNKNOWN = 'assistant_action_unknown',
  TRANSCRIPTION_SUCCESS = 'transcription_success',
}
