export interface ItFindAllResponse<T> {
  data: T[];
  metadata: {
    records: number;
    frame: number;
    frameSize: number;
    lastFrame: number;
  };
}
