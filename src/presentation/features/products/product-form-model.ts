export interface ProductFlavorForm {
  id?: string;
  name: string;
  main_image_public_id: string;
  main_image_secure_url: string;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  initial_quantity: number;
}

export interface ProductForm {
  name: string;
  brand_id: string;
  cover_public_id: string;
  cover_secure_url: string;
  short_description: string;
  display_order: number;
  is_active: boolean;
  category_ids: string[];
  flavors: ProductFlavorForm[];
}

export const emptyFlavor = (): ProductFlavorForm => ({
  name: "",
  main_image_public_id: "",
  main_image_secure_url: "",
  display_order: 0,
  is_featured: false,
  is_active: true,
  initial_quantity: 0,
});

export const emptyForm: ProductForm = {
  name: "",
  brand_id: "",
  cover_public_id: "",
  cover_secure_url: "",
  short_description: "",
  display_order: 0,
  is_active: true,
  category_ids: [],
  flavors: [emptyFlavor()],
};
