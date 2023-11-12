import * as ort from 'onnxruntime-web';

export type Tensor = {
  shape: number[];
  data: Float32Array;
  dataType: 'float32';
};
export type Imports = {
  createSession: (model: any) => Promise<ort.InferenceSession>;
  runSession(
    session: ort.InferenceSession,
    inputs: Tensor,
  ): Promise<Tensor[]>;
};
