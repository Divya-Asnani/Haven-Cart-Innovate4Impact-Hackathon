export interface Product {
  id: string;
  name: string;
  code?: string;
  brand: string;
  price: number;
  mrp: number;
  discount: string;
  category: string;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  sizes: string[];
  fabric?: string;
  care?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize: string;
  cartItemId?: string;
}

export type RootStackParamList = {
  MainTabs: undefined;
  Search: undefined;
  CategoryListing: { categoryId: string; categoryName: string };
  ProductDetail: { product: Product };
  Signup: undefined;
  Login: undefined;
  LocationSettings: undefined;
  AccountActivity: undefined;
  AccountPlaceholder: { title: string };
};

export type MainTabParamList = {
  Home: undefined;
  CategoriesTab: { categoryId: string; categoryName: string } | undefined;
  Wishlist: { categoryId: string; categoryName: string } | undefined;
  Bag: undefined;
  Profile: undefined;
};

