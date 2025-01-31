// utils/pdf-loader.ts
import * as pdfjs from 'pdfjs-dist';

// The worker code is loaded dynamically using the "next/dynamic" pattern
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export { pdfjs };