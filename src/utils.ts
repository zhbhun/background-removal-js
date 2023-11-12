export {
  imageDecode,
  imageEncode,
  imageBitmapToImageData,
  imageDataResize,
  imageDataToFloat32Array,
  calculateProportionalSize,
  isAbsoluteURL,
  ensureAbsoluteURL,
  imageSourceToImageData
};

async function imageDecode(blob: Blob): Promise<ImageData> {
  const imageBitmap = await createImageBitmap(blob);
  const imageData = imageBitmapToImageData(imageBitmap);
  return imageData;
}

async function imageEncode(
  imageData: ImageData,
  quality: number = 0.8,
  type: string = 'image/png'
): Promise<Blob> {
  var canvas = new OffscreenCanvas(imageData.width, imageData.height);
  var ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ quality, type });
}

function imageBitmapToImageData(imageBitmap: ImageBitmap): ImageData {
  var canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  var ctx = canvas.getContext('2d')!;

  // Draw the ImageBitmap onto the canvas
  ctx.drawImage(imageBitmap, 0, 0);

  // Retrieve the ImageData from the canvas
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function imageDataResize(
  imageData: ImageData,
  newWidth: number,
  newHeight: number
): Promise<ImageData> {
  const bitmap = await createImageBitmap(imageData, {
    resizeWidth: newWidth,
    resizeHeight: newHeight,
    resizeQuality: 'high',
    premultiplyAlpha: 'premultiply'
  });
  return imageBitmapToImageData(bitmap);
}

function imageDataToFloat32Array(
  image: ImageData,
  mean: number[] = [128, 128, 128],
  std: number[] = [256, 256, 256]
): Float32Array {
  var imageBufferData = image.data;

  const stride = image.width * image.height;
  const float32Data = new Float32Array(3 * stride);

  // r_0, r_1, .... g_0,g_1, .... b_0
  for (let i = 0, j = 0; i < imageBufferData.length; i += 4, j += 1) {
    float32Data[j] = (imageBufferData[i] - mean[0]) / std[0];
    float32Data[j + stride] = (imageBufferData[i + 1] - mean[1]) / std[1];
    float32Data[j + stride + stride] =
      (imageBufferData[i + 2] - mean[2]) / std[2];
  }

  return float32Data;
}

function calculateProportionalSize(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): [number, number] {
  if (originalWidth > maxWidth || originalHeight > maxHeight) {
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const scalingFactor = Math.min(widthRatio, heightRatio);
    const newWidth = Math.floor(originalWidth * scalingFactor);
    const newHeight = Math.floor(originalHeight * scalingFactor);
    return [newWidth, newHeight];
  }
  return [originalWidth, originalHeight];
}

function isAbsoluteURL(url: string): boolean {
  const regExp = new RegExp('^(?:[a-z+]+:)?//', 'i');
  return regExp.test(url); // true - regular http absolute URL
}

function ensureAbsoluteURL(url: string): string {
  if (isAbsoluteURL(url)) {
    return url;
  } else {
    return new URL(url, window.location.href).href;
  }
}

async function imageSourceToImageData(
  image: string | URL | ArrayBuffer | ImageData | Blob | Uint8Array
) {
  if (typeof image === 'string') {
    image = ensureAbsoluteURL(image);
    image = new URL(image);
  }
  if (image instanceof URL) {
    const response = await fetch(image, {});
    image = await response.blob();
  }
  if (image instanceof ArrayBuffer || ArrayBuffer.isView(image)) {
    image = new Blob([image]);
  }
  if (image instanceof Blob) {
    image = await imageDecode(image);
  }

  return image as ImageData;
}
