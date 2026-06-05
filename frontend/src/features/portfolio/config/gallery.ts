export interface GalleryImage {
    id: string;
    src?: string;
    alt: string;
}

export const galleryImages = [
    { id: "gallery-01", src: "/images/gallery/gallery-01.jpeg", alt: "Gallery image 1" },
    { id: "gallery-02", src: "/images/gallery/gallery-02.jpeg", alt: "Gallery image 2" },
    { id: "gallery-03", src: "/images/gallery/gallery-03.jpeg", alt: "Gallery image 3" },
    { id: "gallery-04", src: "/images/gallery/gallery-04.jpeg", alt: "Gallery image 4" },
    { id: "gallery-05", src: "/images/gallery/gallery-05.jpeg", alt: "Gallery image 5" },
    { id: "gallery-06", src: "/images/gallery/gallery-06.jpeg", alt: "Gallery image 6" },
    { id: "gallery-07", src: "/images/gallery/gallery-07.jpeg", alt: "Gallery image 7" },
    { id: "gallery-08", src: "/images/gallery/gallery-08.jpeg", alt: "Gallery image 8" },
    { id: "gallery-09", src: "/images/gallery/gallery-09.jpeg", alt: "Gallery image 9" },
    { id: "gallery-10", src: "/images/gallery/gallery-10.jpeg", alt: "Gallery image 10" },
] satisfies readonly GalleryImage[];
