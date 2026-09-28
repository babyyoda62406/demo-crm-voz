/** Origen de la orden recibida por el asistente. */
export enum AssistantInputType {
  /** La persona persona usuaria escribió la orden en el campo de texto. */
  TEXTO = 'TEXTO',
  /** La persona persona usuaria dictó la orden y se transcribió con ElevenLabs. */
  VOZ = 'VOZ',
}
