import { Component, signal } from '@angular/core';
import { PdfMerger, PdfInfo } from './pdf-merger';
import {MatIconModule} from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-root',
  imports: [MatIconModule, MatButtonModule,MatCardModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Merge PDFs');

  // Cambio a un array de PDFs para soportar múltiples archivos
  selectedPdfs = signal<PdfInfo[]>([]);
  isProcessing = signal<boolean>(false);
  
  constructor(private pdfMergerService: PdfMerger) {}

  /**
   * Maneja la selección de múltiples archivos PDF
   */
  async onFilesSelected(event: any): Promise<void> {
    const files = Array.from(event.target.files) as File[];
    if (!files.length) return;

    this.isProcessing.set(true);

    try {
      // Validar archivos PDF
      const { valid, invalid } = this.pdfMergerService.validatePdfFiles(files);
      
      if (invalid.length > 0) {
        alert(`Los siguientes archivos no son PDFs válidos y serán ignorados:\n${invalid.map(f => f.name).join('\n')}`);
      }

      if (valid.length === 0) {
        alert('No se seleccionaron archivos PDF válidos');
        return;
      }

      // Analizar cada PDF válido
      const pdfInfos: PdfInfo[] = [];
      for (const file of valid) {
        try {
          const pdfInfo = await this.pdfMergerService.analyzePdf(file);
          pdfInfos.push(pdfInfo);
        } catch (error) {
          console.error(`Error analizando ${file.name}:`, error);
          alert(`Error al analizar "${file.name}": ${error}`);
        }
      }

      // Actualizar la lista de PDFs seleccionados
      this.selectedPdfs.set([...this.selectedPdfs(), ...pdfInfos]);

    } catch (error) {
      console.error('Error procesando archivos:', error);
      alert('Error al procesar los archivos seleccionados');
    } finally {
      this.isProcessing.set(false);
      event.target.value = ''; // Limpiar el input para permitir seleccionar los mismos archivos nuevamente
    }
  }

  /**
   * Combina todos los PDFs seleccionados
   */
  async mergePdfs(): Promise<void> {
    const pdfs = this.selectedPdfs();
    
    if (pdfs.length < 2) {
      alert('Selecciona al menos 2 archivos PDF para combinar');
      return;
    }

    this.isProcessing.set(true);

    try {
      const fecha = new Date().toISOString().slice(0, 10);
      await this.pdfMergerService.mergePdfsAndDownload(pdfs, {
        filename: `merged-${pdfs.length}-pdfs-${fecha}.pdf`
      });
      
      /*alert(`PDFs combinados exitosamente. Total de páginas: ${this.getTotalPages()}`);*/

    } catch (error) {
      console.error('Error combinando PDFs:', error);
      alert(`Error al combinar PDFs: ${error}`);
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Remueve un PDF de la lista
   */
  removePdf(index: number): void {
    const currentPdfs = this.selectedPdfs();
    const newPdfs = currentPdfs.filter((_, i) => i !== index);
    this.selectedPdfs.set(newPdfs);
  }

  /**
   * Mueve un PDF hacia arriba en la lista
   */
  movePdfUp(index: number): void {
    if (index === 0) return; // Ya está en la primera posición
    
    const currentPdfs = this.selectedPdfs();
    const newPdfs = [...currentPdfs];
    
    // Intercambiar posiciones
    [newPdfs[index - 1], newPdfs[index]] = [newPdfs[index], newPdfs[index - 1]];
    
    this.selectedPdfs.set(newPdfs);
  }

  /**
   * Mueve un PDF hacia abajo en la lista
   */
  movePdfDown(index: number): void {
    const currentPdfs = this.selectedPdfs();
    if (index === currentPdfs.length - 1) return; // Ya está en la última posición
    
    const newPdfs = [...currentPdfs];
    
    // Intercambiar posiciones
    [newPdfs[index], newPdfs[index + 1]] = [newPdfs[index + 1], newPdfs[index]];
    
    this.selectedPdfs.set(newPdfs);
  }

  /**
   * Limpia todos los PDFs seleccionados
   */
  clearAllPdfs(): void {
    this.selectedPdfs.set([]);
  }

  /**
   * Calcula el total de páginas
   */
  getTotalPages(): number {
    return this.selectedPdfs().reduce((total, pdf) => total + pdf.pageCount, 0);
  }
}
