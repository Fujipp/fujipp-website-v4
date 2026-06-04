export interface GalleryImage {
    id: string;
    src?: string;
    alt: string;
}

export const galleryImages = [
    { id: "gallery-01", src: "/images/gallery/48302A97-257E-407D-B2AF-EBC8F2E413D9_1_105_c.jpeg", alt: "Gallery image 1" },
    { id: "gallery-02", src: "/images/gallery/E0337789-CF8B-460C-853F-9DABB9DDCE77_1_102_o.jpeg", alt: "Gallery image 2" },
    { id: "gallery-03", src: "/images/gallery/2F10CE6E-3C9D-4721-8787-FD6A248647E1.jpeg", alt: "Gallery image 3" },
    { id: "gallery-04", src: "/images/gallery/A63ECB97-B67D-4C90-9580-A61FDAD41EF6_1_102_o.jpeg", alt: "Gallery image 4" },
    { id: "gallery-05", src: "/images/gallery/1962AD9C-8398-4D95-977F-B971631849FC_1_105_c.jpeg", alt: "Gallery image 5" },
    { id: "gallery-06", src: "/images/gallery/09A067DF-8165-4C5B-9530-E9A1F8EA9C8C_1_102_o.jpeg", alt: "Gallery image 6" },
    { id: "gallery-07", src: "/images/gallery/78EA61AD-9376-4C6D-8662-8A7906A29CDA_1_105_c.jpeg", alt: "Gallery image 7" },
    { id: "gallery-08", src: "/images/gallery/CC8DC2A3-362B-41E2-AB73-6437B48525CA.jpeg", alt: "Gallery image 8" },
    { id: "gallery-09", src: "/images/gallery/5E41C9D6-4D69-4BDF-8F54-08496F6912FD_1_105_c.jpeg", alt: "Gallery image 9" },
    { id: "gallery-10", src: "/images/gallery/1C545BA4-9489-45A4-AC7A-C50580C21F21.jpeg", alt: "Gallery image 10" },
] satisfies readonly GalleryImage[];
