import { Injectable } from '@angular/core';
import { PDFDocument } from 'pdf-lib';

export interface PdfInfo {
  file: File;
  pageCount: number;
  name: string;
}

export interface MergeOptions {
  filename?: string;
  autoDownload?: boolean;
}


@Injectable({
  providedIn: 'root'
})
export class PdfMerger {
  /**
   * Analiza un archivo PDF y retorna información básica
   */
  async analyzePdf(file: File): Promise<PdfInfo> {
    if (file.type !== 'application/pdf') {
      throw new Error('El archivo debe ser un PDF válido');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();

      return {
        file,
        pageCount,
        name: file.name
      };
    } catch (error) {
      throw new Error(`Error al analizar el PDF "${file.name}": ${error}`);
    }
  }

  /**
   * Combina múltiples PDFs en uno solo
   * @param pdfFiles - Array de archivos File o PdfInfo
   * @param options - Opciones de configuración
   * @returns Uint8Array del PDF combinado
   */
  async mergePdfs(
    pdfFiles: (File | PdfInfo)[], 
    options: MergeOptions = {}
  ): Promise<Uint8Array> {
    
    if (!pdfFiles || pdfFiles.length === 0) {
      throw new Error('Debe proporcionar al menos un archivo PDF');
    }

    try {
      const mergedPdf = await PDFDocument.create();
      let totalPages = 0;

      // Procesar cada PDF
      for (const pdfInput of pdfFiles) {
        const file = this.isFile(pdfInput) ? pdfInput : pdfInput.file;
        
        // Validar que sea PDF
        if (file.type !== 'application/pdf') {
          throw new Error(`El archivo "${file.name}" no es un PDF válido`);
        }

        // Cargar el PDF
        const arrayBuffer = await file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(arrayBuffer);
        const pageCount = sourcePdf.getPageCount();

        // Copiar todas las páginas
        const pageIndices = Array.from({length: pageCount}, (_, i) => i);
        const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);

        // Añadir las páginas al PDF combinado
        copiedPages.forEach(page => mergedPdf.addPage(page));
        
        totalPages += pageCount;
      }

      console.log(`PDF combinado exitosamente. Total de páginas: ${totalPages}`);
      
      // Generar el PDF final
      const pdfBytes = await mergedPdf.save();
      return new Uint8Array(pdfBytes);

    } catch (error) {
      throw new Error(`Error al combinar PDFs: ${error}`);
    }
  }

  /**
   * Combina PDFs y los descarga automáticamente
   */
  async mergePdfsAndDownload(
    pdfFiles: (File | PdfInfo)[], 
    options: MergeOptions = {}
  ): Promise<void> {
    
    const pdfBytes = await this.mergePdfs(pdfFiles, options);
    const filename = options.filename || this.generateFilename(pdfFiles);
    
    this.downloadPdf(pdfBytes, filename);
  }

  /**
   * Descarga un PDF
   */
  downloadPdf(pdfBytes: Uint8Array, filename: string): void {
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    // Limpiar memoria
    URL.revokeObjectURL(link.href);
  }

  /**
   * Genera un nombre de archivo basado en los PDFs de entrada
   */
  private generateFilename(pdfFiles: (File | PdfInfo)[]): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const count = pdfFiles.length;
    return `merged-${count}-pdfs-${timestamp}.pdf`;
  }

  /**
   * Verifica si el objeto es un File
   */
  private isFile(obj: any): obj is File {
    return obj instanceof File;
  }

  /**
   * Método de conveniencia para combinar solo 2 PDFs (mantiene compatibilidad)
   */
  async mergeTwoPdfs(file1: File, file2: File, filename?: string): Promise<Uint8Array> {
    return this.mergePdfs([file1, file2], { filename });
  }

  /**
   * Valida un array de archivos PDF
   */
  validatePdfFiles(files: File[]): { valid: File[], invalid: File[] } {
    const valid: File[] = [];
    const invalid: File[] = [];

    files.forEach(file => {
      if (file.type === 'application/pdf') {
        valid.push(file);
      } else {
        invalid.push(file);
      }
    });

    return { valid, invalid };
  }
}
