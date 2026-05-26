export interface GalleryImage {
    id: string;
    src?: string;
    alt: string;
}

export const galleryImages = [
    { id: "gallery-01", src: "/images/gallery/FCB671C3-0EFF-48AF-97ED-8B8F57AAE6A3_1_105_c.jpeg", alt: "Gallery image 1" },
    { id: "gallery-02", src: "/images/gallery/F8194A2C-5191-4D68-8F58-05DC76CBD989_1_105_c.jpeg", alt: "Gallery image 2" },
    { id: "gallery-03", src: "/images/gallery/IT D-Day-2026-Photo.jpg", alt: "Gallery image 3" },
    { id: "gallery-04", alt: "Gallery image 4" },
    { id: "gallery-05", alt: "Gallery image 5" },
    { id: "gallery-06", alt: "Gallery image 6" },
    { id: "gallery-07", alt: "Gallery image 7" },
    { id: "gallery-08", alt: "Gallery image 8" },
    { id: "gallery-09", alt: "Gallery image 9" },
    { id: "gallery-10", alt: "Gallery image 10" },
] satisfies readonly GalleryImage[];
