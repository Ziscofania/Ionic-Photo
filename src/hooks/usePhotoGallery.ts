import { useState, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import type { Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Interface que representa una foto guardada por el usuario.
 */
export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}

/**
 * Hook personalizado para manejar galería de fotos
 * - Tomar foto
 * - Guardar en almacenamiento interno
 * - Cargar fotos guardadas
 * - Eliminar fotos
 */
export function usePhotoGallery() {

  /* ==============================
     STATE
  ============================== */
  const [photos, setPhotos] = useState<UserPhoto[]>([]);

  /* ==============================
     EFFECTS
  ============================== */
  useEffect(() => {
    loadSavedPhotos();
  }, []);

  /* ==============================
     PRIVATE FUNCTIONS
  ============================== */

  /**
   * Carga las fotos almacenadas en el directorio interno
   */
  const loadSavedPhotos = async () => {
    try {
      const photoList = await Filesystem.readdir({
        path: '',
        directory: Directory.Data,
      });

      const loadedPhotos: UserPhoto[] = photoList.files.map(file => ({
        filepath: file.name,
        webviewPath: file.uri,
      }));

      setPhotos(loadedPhotos);
    } catch (error) {
      console.error('Error cargando fotos guardadas:', error);
    }
  };

  /**
   * Convierte un Blob en base64
   */
  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
  };

  /**
   * Guarda la imagen en el Filesystem
   */
  const savePicture = async (
    photo: Photo,
    fileName: string
  ): Promise<UserPhoto> => {

    const response = await fetch(photo.webPath!);
    const blob = await response.blob();
    const base64Data = await convertBlobToBase64(blob);

    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });

    return {
      filepath: fileName,
      webviewPath: photo.webPath,
    };
  };

  /* ==============================
     PUBLIC FUNCTIONS
  ============================== */

  /**
   * Toma una nueva foto y la agrega a la galería
   */
  const addNewToGallery = async () => {
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });

    const fileName = `${Date.now()}.jpeg`;
    const savedImageFile = await savePicture(capturedPhoto, fileName);

    setPhotos(prevPhotos => [savedImageFile, ...prevPhotos]);
  };

  /**
   * Elimina una foto del almacenamiento y del estado
   */
  const deletePhoto = async (photo: UserPhoto) => {
    await Filesystem.deleteFile({
      path: photo.filepath,
      directory: Directory.Data,
    });

    setPhotos(prevPhotos =>
      prevPhotos.filter(p => p.filepath !== photo.filepath)
    );
  };

  /* ==============================
     RETURN API
  ============================== */
  return {
    photos,
    addNewToGallery,
    deletePhoto,
  };
}