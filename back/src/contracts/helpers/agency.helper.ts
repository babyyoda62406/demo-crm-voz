/**
 * Marca de la agencia que genera y envia los documentos.
 *
 * Viaja a tres sitios que ensenaban el nombre equivocado: los metadatos de los
 * .docx/.pdf generados (donde salia el autor de la plantilla original), la
 * pagina publica de firma y la diligencia de firma electronica.
 *
 * Vive aqui y no en `env/envs.ts` porque ese fichero es del nucleo comun; se
 * admite sobreescribir los valores por entorno para no recompilar si cambia la
 * razon social.
 */
export const AGENCIA = {
  /** Razon social. Es la que se graba como autor de los documentos. */
  nombre: process.env.AGENCIA_NOMBRE?.trim() || 'Vantia Patrimonio S.L.',
  /** Descriptor corto bajo el nombre, en la cabecera del enlace publico. */
  descripcion:
    process.env.AGENCIA_DESCRIPCION?.trim() || 'Gestión inmobiliaria',
  /** Telefono o correo de contacto para el firmante. Vacio = no se muestra. */
  contacto: process.env.AGENCIA_CONTACTO?.trim() || '',
};
