import * as ort from 'onnxruntime-web';
import { MODEL_RESOLUTION } from './bundle';
import { imageDataResize, imageDataToFloat32Array } from './utils';
import { Imports } from './tensor';
import { calculateProportionalSize } from './utils';
import { Config } from './schema';

const MAX_RESOLUTION = 2048;

export async function runInference(
  imageData: ImageData,
  config: Config,
  imports: Imports,
  session: ort.InferenceSession
): Promise<ImageData> {
  if (config.progress) config.progress('compute:inference', 0, 1);
  const resolution = MODEL_RESOLUTION[config.model] || 320;

  const dims = [1, 3, resolution, resolution];
  let tensorImage = await imageDataResize(imageData, resolution, resolution);
  const inputTensorData = imageDataToFloat32Array(tensorImage);

  const predictionsDict = await imports.runSession(
    session,
    { data: inputTensorData, shape: dims, dataType: 'float32' }
  );

  const stride = 4 * resolution * resolution;
  for (let i = 0; i < stride; i += 4) {
    let idx = i / 4;
    let alpha = predictionsDict[0].data[idx];
    tensorImage.data[i + 3] = alpha * 255;
  }

  tensorImage = await imageDataResize(
    tensorImage,
    imageData.width,
    imageData.height
  );

  for (let i = 0; i < imageData.data.length; i += 4) {
    let idx = i + 3;
    if (tensorImage.data[idx] === 0) {
      imageData.data[idx - 3] = 0;
      imageData.data[idx - 2] = 0;
      imageData.data[idx - 1] = 0;
    }
    imageData.data[idx] = tensorImage.data[idx];
  }

  const [width, height] = calculateProportionalSize(
    imageData.width,
    imageData.height,
    MAX_RESOLUTION,
    MAX_RESOLUTION
  );
  if (width !== imageData.width || height !== imageData.height) {
    imageData = await imageDataResize(imageData, width, height);
  }

  if (config.progress) config.progress('compute:inference', 1, 1);
  return imageData;
}
