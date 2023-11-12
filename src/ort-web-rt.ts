export { createOnnxRuntime };

import { simd, threads } from 'wasm-feature-detect';
import { Tensor, Imports } from './tensor';

import * as ort from 'onnxruntime-web';
import * as Bundle from './bundle';

function createOnnxRuntime(config: any): Imports {
  return {
    createSession: async (model: any) => {
      const capabilities = {
        simd: await simd(),
        threads: await threads(),
        SharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
        numThreads: navigator.hardwareConcurrency ?? 4,
        // @ts-ignore
        webgpu: navigator.gpu !== undefined
      };
      if (config.debug) {
        console.debug('Capabilities:', capabilities);
        ort.env.debug = true;
        ort.env.logLevel = 'verbose';
      }

      ort.env.wasm.numThreads = capabilities.numThreads;
      ort.env.wasm.simd = capabilities.simd;
      ort.env.wasm.proxy = config.proxyToWorker;
      ort.env.wasm.wasmPaths = {
        // 'ort-wasm-simd-threaded.jsep.wasm':  URL.createObjectURL(
        //   await Bundle.load('ort-wasm-simd-threaded.jsep.wasm', config)
        // ),
        // 'ort-wasm-simd.jsep.wasm': URL.createObjectURL(
        //   await Bundle.load('ort-wasm-simd.jsep.wasm', config)
        // ),
        'ort-wasm-simd-threaded.wasm': URL.createObjectURL(
          await Bundle.load('ort-wasm-simd-threaded.wasm', config)
        ),
        'ort-wasm-simd.wasm': URL.createObjectURL(
          await Bundle.load('ort-wasm-simd.wasm', config)
        ),
        'ort-wasm-threaded.wasm': URL.createObjectURL(
          await Bundle.load('ort-wasm-threaded.wasm', config)
        ),
        'ort-wasm.wasm': URL.createObjectURL(
          await Bundle.load('ort-wasm.wasm', config)
        )
      };

      if (config.debug) {
        console.debug('ort.env.wasm:', ort.env.wasm);
      }

      const ort_config: ort.InferenceSession.SessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        executionMode: 'parallel',
        enableCpuMemArena: true
      };

      const session = await ort.InferenceSession.create(
        model,
        ort_config
      ).catch((e: any) => {
        throw new Error(
          `Failed to create session: ${e}. Please check if the publicPath is set correctly.`
        );
      });

      // URL.revokeObjectURL(ort.env.wasm.wasmPaths['ort-wasm-simd-threaded.jsep.wasm']!);
      // URL.revokeObjectURL(ort.env.wasm.wasmPaths['ort-wasm-simd.jsep.wasm']!);
      URL.revokeObjectURL(
        ort.env.wasm.wasmPaths['ort-wasm-simd-threaded.wasm']!
      );
      URL.revokeObjectURL(ort.env.wasm.wasmPaths['ort-wasm-simd.wasm']!);
      URL.revokeObjectURL(ort.env.wasm.wasmPaths['ort-wasm-threaded.wasm']!);
      URL.revokeObjectURL(ort.env.wasm.wasmPaths['ort-wasm.wasm']!);

      return session;
    },
    runSession: async (session: ort.InferenceSession, tensor: Tensor) => {
      const feeds: Record<string, any> = {
        [session.inputNames[0]]: new ort.Tensor(
          'float32',
          new Float32Array(tensor.data),
          tensor.shape
        )
      };
      const outputData = await session.run(feeds, {});
      const outputKVPairs: Tensor[] = [];

      for (const key of session.outputNames) {
        let output: ort.Tensor = outputData[key];
        let tensor: Tensor = {
          data: output.data as Float32Array,
          shape: output.dims as number[],
          dataType: 'float32'
        };
        outputKVPairs.push(tensor);
      }

      return outputKVPairs;
    }
  };
}
