/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { processFilesPipeline } from './fileProcessor';

export interface SamplePackFileSpec {
  name: string;
  type?: string;
}

export interface SamplePackManifest {
  files: SamplePackFileSpec[];
}

interface LoadSamplePackParams {
  dispatch: React.Dispatch<any>;
  currentFiles: any[];
  addAlert: (msg: string) => void;
  setProcessing: (val: boolean) => void;
  t: (key: any) => string;
}

export async function loadSamplePack({
  dispatch,
  currentFiles,
  addAlert,
  setProcessing,
  t
}: LoadSamplePackParams): Promise<void> {
  setProcessing(true);
  try {
    // 1. Fetch requirements.json
    const reqResponse = await fetch('/sample-pack/requirements.json');
    if (!reqResponse.ok) {
      throw new Error(`Failed to load requirements.json: ${reqResponse.statusText}`);
    }
    const reqData = await reqResponse.json();

    // Load requirements into store
    dispatch({
      type: 'LOAD_REQUIREMENTS',
      payload: {
        tender: reqData.tender,
        requirements: reqData.requirements
      }
    });

    // 2. Fetch manifest.json
    const manifestResponse = await fetch('/sample-pack/manifest.json');
    if (!manifestResponse.ok) {
      throw new Error(`Failed to load manifest.json: ${manifestResponse.statusText}`);
    }
    const manifestData: SamplePackManifest = await manifestResponse.json();

    // 3. Fetch each file as a real browser File object
    const filesToUpload: File[] = [];
    for (const fileSpec of manifestData.files) {
      try {
        const fileRes = await fetch(`/sample-pack/${fileSpec.name}`);
        if (!fileRes.ok) {
          throw new Error(`Failed to fetch file: ${fileSpec.name}`);
        }
        const blob = await fileRes.blob();
        
        // Construct standard File object
        const fileObj = new File([blob], fileSpec.name, {
          type: fileSpec.type || 'application/pdf'
        });
        filesToUpload.push(fileObj);
      } catch (err) {
        console.error(`Error loading sample pack file: ${fileSpec.name}`, err);
      }
    }

    // 4. Pass the fetched File list to the normal upload flow!
    await processFilesPipeline({
      fileList: filesToUpload,
      currentFiles,
      addAlert,
      dispatch,
      t
    });

  } catch (err: any) {
    console.error('Failed to load sample pack', err);
    addAlert(`Demo Load Failed: ${err.message || 'Internal Error'}`);
  } finally {
    setProcessing(false);
  }
}
