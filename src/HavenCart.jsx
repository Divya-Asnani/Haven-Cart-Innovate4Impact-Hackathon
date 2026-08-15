import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Heart,
  ShoppingBag,
  User,
  Grid,
  ChevronRight,
  ChevronLeft,
  X,
  ArrowLeft,
  Star,
  Check,
  MapPin,
  Percent,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  Trash2,
  Tag,
  SlidersHorizontal,
  Share2,
  Clock,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  FileText
} from 'lucide-react';

// ==========================================
// CONFIGURABLE COVERT TRIGGER CONSTANT
// ==========================================
export const SEARCH_TRIGGER = "cotton kurta 2104";

// ==========================================
// DUMMY DATA FOR HAVENCART SHOPPING APP
// ==========================================
const CATEGORIES = [
  { id: 'all', name: 'All', icon: Grid },
  { id: 'women', name: 'Women', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
  { id: 'men', name: 'Men', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: 'kids', name: 'Kids', image: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=150&q=80' },
  { id: 'beauty', name: 'Beauty', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=150&q=80' },
  { id: 'footwear', name: 'Footwear', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=150&q=80' },
  { id: 'home', name: 'Home', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=150&q=80' },
];

const BANNERS = [
  {
    id: 1,
    title: 'END OF SEASON SALE',
    subtitle: 'FLAT 50% - 80% OFF',
    tag: 'GRAND FESTIVAL OFFER',
    bgColor: 'from-pink-600 via-rose-500 to-amber-500',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 2,
    title: 'AUTUMN COLLECTION',
    subtitle: 'UNDER ₹999 DEALS',
    tag: 'TRENDING STYLES',
    bgColor: 'from-purple-600 via-pink-500 to-red-400',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 3,
    title: 'ETHNIC ELEGANCE',
    subtitle: 'MIN. 60% OFF ON KURTAS',
    tag: 'EXCLUSIVE BRANDS',
    bgColor: 'from-amber-600 via-pink-600 to-rose-700',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80'
  }
];

const DUMMY_PRODUCTS = [
  {
    id: 101,
    brand: 'ANOUK',
    name: 'Women Pure Cotton Printed Straight Kurta',
    category: 'women',
    price: 899,
    mrp: 2499,
    discount: 64,
    rating: 4.3,
    reviews: 1840,
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=500&q=80'
    ],
    description: 'Crafted from soft breathable pure cotton, this traditional printed straight kurta features a round neck, three-quarter sleeves, and intricate floral patterns perfect for daily & casual ethnic wear.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    fabric: '100% Pure Cotton',
    care: 'Machine wash in cold water'
  },
  {
    id: 102,
    brand: 'ROADSTER',
    name: 'Men Slim Fit Solid Casual Denim Shirt',
    category: 'men',
    price: 1199,
    mrp: 2999,
    discount: 60,
    rating: 4.4,
    reviews: 2410,
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80'
    ],
    description: 'A timeless casual denim shirt tailored in slim fit with spread collar, button placket, double pocket design, and curved hemline.',
    sizes: ['38', '40', '42', '44'],
    fabric: '100% Cotton Denim',
    care: 'Wash separately with dark colors'
  },
  {
    id: 103,
    brand: 'HRX BY HRITHIK',
    name: 'Unisex Rapid-Dry Lightweight Running Shoes',
    category: 'footwear',
    price: 1599,
    mrp: 3999,
    discount: 60,
    rating: 4.5,
    reviews: 3120,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80'
    ],
    description: 'Engineered with breathable mesh upper, cushioned EVA midsole, and high-traction rubber outsole for maximum comfort during intense workouts.',
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'],
    fabric: 'Breathable Mesh & EVA',
    care: 'Wipe clean with dry cloth'
  },
  {
    id: 104,
    brand: 'MANGO',
    name: 'Floral Print A-Line Midi Wrap Dress',
    category: 'women',
    price: 2490,
    mrp: 4990,
    discount: 50,
    rating: 4.2,
    reviews: 980,
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=500&q=80'
    ],
    description: 'Elegantly styled floral wrap midi dress with V-neckline, short puffed sleeves, and a self-tie waist belt. Perfect for weekend brunches.',
    sizes: ['XS', 'S', 'M', 'L'],
    fabric: 'Viscose Blend',
    care: 'Dry clean recommended'
  },
  {
    id: 105,
    brand: 'WROGN',
    name: 'Men Tapered Fit Stretch Casual Chino Trousers',
    category: 'men',
    price: 1349,
    mrp: 2699,
    discount: 50,
    rating: 4.1,
    reviews: 1450,
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=500&q=80'
    ],
    description: 'Modern tapered chinos with 4-way comfort stretch, slant side pockets, and clean rear welt pockets for smart versatile pairing.',
    sizes: ['30', '32', '34', '36'],
    fabric: 'Cotton Elastane Blend',
    care: 'Machine wash warm'
  },
  {
    id: 106,
    brand: 'BIBA',
    name: 'Embroidered Anarkali Kurta & Dupatta Set',
    category: 'women',
    price: 2999,
    mrp: 6999,
    discount: 57,
    rating: 4.6,
    reviews: 2890,
    image: 'https://images.unsplash.com/photo-1583391733975-f095166299b8?auto=format&fit=crop&w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1583391733975-f095166299b8?auto=format&fit=crop&w=500&q=80'
    ],
    description: 'Festive flare Anarkali suit with golden zari thread embroidery on neck and sleeves, paired with an organza printed dupatta.',
    sizes: ['S', 'M', 'L', 'XL'],
    fabric: 'Silk Chiffon',
    care: 'Dry clean only'
  },
  {
    id: 107,
    brand: 'MAC COSMETICS',
    name: 'Matte Lipstick - Velvet Teddy (3g)',
    category: 'beauty',
    price: 1950,
    mrp: 2300,
    discount: 15,
    rating: 4.7,
    reviews: 4200,
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=500&q=80'
    ],
    description: 'Iconic creamy matte lipstick formula delivering intense color payoff and non-drying 12-hour comfortable wear.',
    sizes: ['Standard 3g'],
    fabric: 'Dermatologically Tested',
    care: 'Store in cool place'
  },
  {
    id: 108,
    brand: 'HOME CENTRE',
    name: 'Cotton 144 TC Geometric Print Double Bedsheet',
    category: 'home',
    price: 799,
    mrp: 1999,
    discount: 60,
    rating: 4.2,
    reviews: 1120,
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=500&q=80',
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=500&q=80'
    ],
    description: 'Soft 100% cotton double bedsheet with 2 matching pillow covers featuring modern geometric motif prints.',
    sizes: ['Double Bed (90x100 in)'],
    fabric: '100% Cotton',
    care: 'Machine wash regular'
  }
];

const RECENT_SEARCHES = [
  'Cotton Kurta 2104',
  'Denim Jacket Men',
  'Floral Summer Dress',
  'HRX Running Shoes',
  'Anouk Kurti'
];

const TRENDING_KEYWORDS = [
  'Kurta Sets',
  'Oversized T-Shirts',
  'Sneakers',
  'Sarees',
  'Lipsticks',
  'Smart Watches'
];

const DUMMY_ORDERS = [
  {
    id: 'HC-948271',
    date: '12 Aug 2026',
    status: 'Delivered',
    amount: 1798,
    items: ['ANOUK Cotton Printed Kurta', 'HOME CENTRE Bedsheet']
  },
  {
    id: 'HC-827103',
    date: '28 Jul 2026',
    status: 'Delivered',
    amount: 1599,
    items: ['HRX Rapid-Dry Running Shoes']
  }
];

// ==========================================
// MAIN COMPONENT: HavenCart
// ==========================================
export default function HavenCart() {
  // Navigation & View State
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' | 'search' | 'products' | 'detail' | 'cart' | 'profile' | 'accountOverview' | 'accountSubpage'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(DUMMY_PRODUCTS[0]);
  const [cartItems, setCartItems] = useState([
    { ...DUMMY_PRODUCTS[0], quantity: 1, selectedSize: 'M' }
  ]);
  const [wishlistItems, setWishlistItems] = useState([101, 103]);
  const [selectedSize, setSelectedSize] = useState('M');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const [activeCovertTab, setActiveCovertTab] = useState('addresses'); // 'addresses' | 'support' | 'activity'
  const [checkoutStep, setCheckoutStep] = useState(false);

  // Auto carousel timer
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % BANNERS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Show quick toast notification
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Toggle wishlist state
  const toggleWishlist = (productId, e) => {
    if (e) e.stopPropagation();
    if (wishlistItems.includes(productId)) {
      setWishlistItems(wishlistItems.filter((id) => id !== productId));
      showToast('Removed from Wishlist');
    } else {
      setWishlistItems([...wishlistItems, productId]);
      showToast('Added to Wishlist');
    }
  };

  // Add product to cart
  const addToCart = (product) => {
    const existingIndex = cartItems.findIndex(
      (item) => item.id === product.id && item.selectedSize === selectedSize
    );
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        { ...product, quantity: 1, selectedSize: selectedSize || product.sizes[0] }
      ]);
    }
    showToast('Item added to Bag');
  };

  // Update item quantity in cart
  const updateQuantity = (index, delta) => {
    const updated = [...cartItems];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setCartItems(updated);
  };

  // Handle Search Submission & Covert Trigger Check
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery) return;

    // Check covert activation trigger
    if (cleanQuery.toLowerCase() === SEARCH_TRIGGER.toLowerCase()) {
      // SILENT TRIGGER ACTIVATION: Navigate to AccountOverview without any safety/SOS indicators
      setSearchQuery('');
      setCurrentScreen('accountOverview');
      return;
    }

    // Normal search handling
    setCurrentScreen('products');
  };

  // Filter products by search or category
  const filteredProducts = DUMMY_PRODUCTS.filter((prod) => {
    const matchesCategory =
      activeCategory === 'all' || prod.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate cart billing totals
  const totalMRP = cartItems.reduce((acc, item) => acc + item.mrp * item.quantity, 0);
  const totalDiscount = cartItems.reduce(
    (acc, item) => acc + (item.mrp - item.price) * item.quantity,
    0
  );
  const finalAmount = totalMRP - totalDiscount;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-between font-sans">
      {/* Outer Desktop Container Wrapper */}
      <div className="w-full max-w-[480px] mx-auto min-h-screen bg-white shadow-2xl relative flex flex-col pb-16 overflow-x-hidden border-x border-gray-200">
        
        {/* ==================================================== */}
        {/* TOP HEADER (STAYS CONSISTENT ACROSS APP)            */}
        {/* ==================================================== */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-3 py-2.5 flex items-center justify-between gap-2 shadow-sm">
          {/* Left Menu / Back Action */}
          {currentScreen !== 'home' ? (
            <button
              onClick={() => {
                if (currentScreen === 'accountSubpage') setCurrentScreen('accountOverview');
                else setCurrentScreen('home');
              }}
              className="p-1.5 hover:bg-gray-100 rounded-full transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          ) : (
            <button className="p-1.5 hover:bg-gray-100 rounded-full transition">
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          )}

          {/* Logo Branding */}
          <div
            onClick={() => setCurrentScreen('home')}
            className="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#FF3F6C] to-rose-400 flex items-center justify-center text-white font-black text-sm shadow-md">
              H
            </div>
            <span className="font-black text-lg tracking-tight text-gray-900">
              Haven<span className="text-[#FF3F6C]">Cart</span>
            </span>
          </div>

          {/* Search Box / Launcher Bar */}
          <div
            onClick={() => {
              if (currentScreen !== 'search') setCurrentScreen('search');
            }}
            className="flex-1 max-w-[170px] bg-gray-100 hover:bg-gray-150 rounded-full px-3 py-1.5 flex items-center gap-1.5 cursor-pointer border border-transparent focus-within:border-pink-300 transition"
          >
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit(e);
              }}
              className="bg-transparent text-xs w-full outline-none text-gray-800 placeholder-gray-400 cursor-pointer"
              readOnly={currentScreen !== 'search'}
            />
          </div>

          {/* Action Icons: Wishlist & Bag */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentScreen('wishlist')}
              className="p-1.5 hover:bg-gray-100 rounded-full relative transition"
            >
              <Heart className="w-5 h-5 text-gray-700" />
              {wishlistItems.length > 0 && (
                <span className="absolute top-0 right-0 bg-[#FF3F6C] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {wishlistItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentScreen('cart')}
              className="p-1.5 hover:bg-gray-100 rounded-full relative transition"
            >
              <ShoppingBag className="w-5 h-5 text-gray-700" />
              {cartItems.length > 0 && (
                <span className="absolute top-0 right-0 bg-[#FF3F6C] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* TOAST NOTIFICATION POPUP */}
        {toastMessage && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg animate-fade-in flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </div>
        )}

        {/* ==================================================== */}
        {/* SCREEN 1: HOME SCREEN                                */}
        {/* ==================================================== */}
        {currentScreen === 'home' && (
          <main className="flex-1 flex flex-col bg-gray-50">
            {/* Horizontal Category Chips */}
            <div className="bg-white py-2 px-3 flex items-center gap-3 overflow-x-auto no-scrollbar border-b border-gray-100">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setCurrentScreen('products');
                  }}
                  className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    activeCategory === cat.id
                      ? 'bg-[#FF3F6C] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <Grid className="w-3.5 h-3.5" />
                  )}
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Promotional Banner Carousel */}
            <div className="relative mx-3 mt-3 rounded-2xl overflow-hidden shadow-md group">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
              >
                {BANNERS.map((banner) => (
                  <div
                    key={banner.id}
                    className={`w-full shrink-0 relative bg-gradient-to-r ${banner.bgColor} text-white p-5 h-44 flex flex-col justify-between`}
                  >
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="absolute right-0 top-0 w-1/2 h-full object-cover opacity-30 mix-blend-overlay"
                    />
                    <span className="self-start text-[10px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full">
                      {banner.tag}
                    </span>
                    <div>
                      <h2 className="text-xl font-black tracking-tight leading-tight drop-shadow">
                        {banner.title}
                      </h2>
                      <p className="text-xs font-bold text-yellow-200 mt-0.5">
                        {banner.subtitle}
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentScreen('products')}
                      className="self-start text-xs font-bold bg-white text-gray-900 px-3.5 py-1.5 rounded-full shadow hover:bg-gray-100 transition"
                    >
                      SHOP NOW
                    </button>
                  </div>
                ))}
              </div>

              {/* Dots indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {BANNERS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setBannerIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      bannerIndex === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Quick Assurance Badges */}
            <div className="grid grid-cols-3 gap-2 px-3 my-3">
              <div className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center gap-2 shadow-xs">
                <Truck className="w-4 h-4 text-[#FF3F6C]" />
                <span className="text-[10px] font-semibold text-gray-600 leading-tight">
                  Free Express Shipping
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center gap-2 shadow-xs">
                <RotateCcw className="w-4 h-4 text-[#FF3F6C]" />
                <span className="text-[10px] font-semibold text-gray-600 leading-tight">
                  14-Day Easy Returns
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center gap-2 shadow-xs">
                <Percent className="w-4 h-4 text-[#FF3F6C]" />
                <span className="text-[10px] font-semibold text-gray-600 leading-tight">
                  100% Genuine Brands
                </span>
              </div>
            </div>

            {/* Section Header */}
            <div className="px-3 pt-2 pb-1 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">
                  Trending Fashion Deals
                </h3>
                <p className="text-[11px] text-gray-500">Handpicked items for you</p>
              </div>
              <button
                onClick={() => setCurrentScreen('products')}
                className="text-xs font-bold text-[#FF3F6C] flex items-center"
              >
                VIEW ALL <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2-Column Product Grid */}
            <div className="grid grid-cols-2 gap-3 px-3 pb-4">
              {DUMMY_PRODUCTS.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => {
                    setSelectedProduct(prod);
                    setCurrentScreen('detail');
                  }}
                  className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer group hover:shadow-md transition"
                >
                  <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    {/* Wishlist Icon */}
                    <button
                      onClick={(e) => toggleWishlist(prod.id, e)}
                      className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-md rounded-full shadow hover:bg-white transition"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          wishlistItems.includes(prod.id)
                            ? 'fill-[#FF3F6C] text-[#FF3F6C]'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                    {/* Rating Badge */}
                    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 shadow-xs">
                      <span>{prod.rating}</span>
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      <span className="text-gray-400 font-normal">| {prod.reviews}</span>
                    </div>
                  </div>

                  <div className="p-2.5 flex flex-col justify-between flex-1">
                    <div>
                      <span className="text-[11px] font-extrabold text-gray-900 tracking-wider uppercase block">
                        {prod.brand}
                      </span>
                      <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                        {prod.name}
                      </p>
                    </div>

                    <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-gray-900">
                        ₹{prod.price}
                      </span>
                      <span className="text-[10px] text-gray-400 line-through">
                        ₹{prod.mrp}
                      </span>
                      <span className="text-[10px] font-bold text-rose-500">
                        ({prod.discount}% OFF)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* ==================================================== */}
        {/* SCREEN 2: SEARCH SCREEN                              */}
        {/* ==================================================== */}
        {currentScreen === 'search' && (
          <main className="flex-1 bg-white p-4 flex flex-col">
            {/* Search Input Bar with Submit Button */}
            <form onSubmit={handleSearchSubmit} className="relative mb-4">
              <input
                type="text"
                autoFocus
                placeholder="Search products, brands or try 'cotton kurta 2104'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 text-sm pl-9 pr-20 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-pink-500 focus:bg-white text-gray-800 transition"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-12 top-3 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2 top-2 bg-[#FF3F6C] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow"
              >
                Go
              </button>
            </form>

            {/* Recent Searches */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Recent Searches
                </span>
                <Clock className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex flex-wrap gap-2">
                {RECENT_SEARCHES.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery(item);
                      if (item.toLowerCase() === SEARCH_TRIGGER.toLowerCase()) {
                        setCurrentScreen('accountOverview');
                      } else {
                        setCurrentScreen('products');
                      }
                    }}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Searches */}
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Trending Keywords
              </span>
              <div className="flex flex-wrap gap-2">
                {TRENDING_KEYWORDS.map((kw, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery(kw);
                      setCurrentScreen('products');
                    }}
                    className="text-xs bg-pink-50 hover:bg-pink-100 text-[#FF3F6C] font-medium px-3 py-1.5 rounded-lg border border-pink-100 transition"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          </main>
        )}

        {/* ==================================================== */}
        {/* SCREEN 3: PRODUCT LISTING / CATEGORY SCREEN           */}
        {/* ==================================================== */}
        {currentScreen === 'products' && (
          <main className="flex-1 bg-gray-50 flex flex-col">
            {/* Filter / Sort Control Bar */}
            <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between text-xs font-semibold text-gray-700">
              <span className="text-gray-500 font-normal">
                Showing {filteredProducts.length} items
              </span>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1 hover:text-[#FF3F6C]">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> SORT BY
                </button>
                <span className="text-gray-300">|</span>
                <button className="flex items-center gap-1 hover:text-[#FF3F6C]">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> FILTER
                </button>
              </div>
            </div>

            {/* Product Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 p-3 flex-1">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setSelectedProduct(prod);
                      setCurrentScreen('detail');
                    }}
                    className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer group hover:shadow-md transition"
                  >
                    <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <button
                        onClick={(e) => toggleWishlist(prod.id, e)}
                        className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-md rounded-full shadow hover:bg-white transition"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            wishlistItems.includes(prod.id)
                              ? 'fill-[#FF3F6C] text-[#FF3F6C]'
                              : 'text-gray-600'
                          }`}
                        />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 shadow-xs">
                        <span>{prod.rating}</span>
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span className="text-gray-400 font-normal">
                          | {prod.reviews}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 flex flex-col justify-between flex-1">
                      <div>
                        <span className="text-[11px] font-extrabold text-gray-900 tracking-wider uppercase block">
                          {prod.brand}
                        </span>
                        <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                          {prod.name}
                        </p>
                      </div>

                      <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-900">
                          ₹{prod.price}
                        </span>
                        <span className="text-[10px] text-gray-400 line-through">
                          ₹{prod.mrp}
                        </span>
                        <span className="text-[10px] font-bold text-rose-500">
                          ({prod.discount}% OFF)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Search className="w-12 h-12 text-gray-300 mb-3" />
                <h4 className="text-sm font-bold text-gray-800">
                  No products found
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  We couldn't find any match for your search criteria. Try searching for something else.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                    setCurrentScreen('home');
                  }}
                  className="mt-4 text-xs font-bold bg-[#FF3F6C] text-white px-4 py-2 rounded-full shadow"
                >
                  Clear Filters & Go Home
                </button>
              </div>
            )}
          </main>
        )}

        {/* ==================================================== */}
        {/* SCREEN 4: PRODUCT DETAIL SCREEN                      */}
        {/* ==================================================== */}
        {currentScreen === 'detail' && selectedProduct && (
          <main className="flex-1 bg-white flex flex-col">
            {/* Image Preview */}
            <div className="relative aspect-[3/4] bg-gray-100">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={(e) => toggleWishlist(selectedProduct.id, e)}
                className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-md rounded-full shadow"
              >
                <Heart
                  className={`w-5 h-5 ${
                    wishlistItems.includes(selectedProduct.id)
                      ? 'fill-[#FF3F6C] text-[#FF3F6C]'
                      : 'text-gray-600'
                  }`}
                />
              </button>
            </div>

            {/* Product Meta Details */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-gray-900 tracking-wider uppercase">
                  {selectedProduct.brand}
                </span>
                <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                  <span>{selectedProduct.rating}</span>
                  <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                </div>
              </div>

              <h2 className="text-sm text-gray-700 mt-1 font-medium leading-snug">
                {selectedProduct.name}
              </h2>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-lg font-black text-gray-900">
                  ₹{selectedProduct.price}
                </span>
                <span className="text-xs text-gray-400 line-through">
                  MRP ₹{selectedProduct.mrp}
                </span>
                <span className="text-xs font-bold text-rose-500">
                  ({selectedProduct.discount}% OFF)
                </span>
              </div>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                inclusive of all taxes
              </p>
            </div>

            {/* Size Selector */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Select Size
                </span>
                <span className="text-xs text-[#FF3F6C] font-semibold">
                  Size Chart
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedProduct.sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`w-10 h-10 rounded-full border text-xs font-bold flex items-center justify-center transition ${
                      selectedSize === sz
                        ? 'border-[#FF3F6C] bg-pink-50 text-[#FF3F6C]'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Details Tab */}
            <div className="p-4 border-b border-gray-100 space-y-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Product Specifications
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {selectedProduct.description}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-400 block text-[10px]">Fabric</span>
                  <span className="font-semibold text-gray-800">
                    {selectedProduct.fabric}
                  </span>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="text-gray-400 block text-[10px]">Care</span>
                  <span className="font-semibold text-gray-800">
                    {selectedProduct.care}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Buttons */}
            <div className="p-3 bg-white border-t border-gray-200 sticky bottom-0 z-30 flex items-center gap-3">
              <button
                onClick={(e) => toggleWishlist(selectedProduct.id, e)}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 transition"
              >
                <Heart
                  className={`w-4 h-4 ${
                    wishlistItems.includes(selectedProduct.id)
                      ? 'fill-[#FF3F6C] text-[#FF3F6C]'
                      : 'text-gray-600'
                  }`}
                />
                WISHLIST
              </button>
              <button
                onClick={() => addToCart(selectedProduct)}
                className="flex-1 py-3 bg-[#FF3F6C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:bg-pink-600 transition"
              >
                <ShoppingBag className="w-4 h-4" /> ADD TO BAG
              </button>
            </div>
          </main>
        )}

        {/* ==================================================== */}
        {/* SCREEN 5: CART / BAG SCREEN                         */}
        {/* ==================================================== */}
        {currentScreen === 'cart' && (
          <main className="flex-1 bg-gray-50 flex flex-col">
            {cartItems.length > 0 ? (
              <div className="flex-1 flex flex-col justify-between">
                {/* Item List */}
                <div className="p-3 space-y-3">
                  {cartItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-3 border border-gray-100 shadow-xs flex gap-3 relative"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-24 object-cover rounded-lg bg-gray-100"
                      />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-gray-900 uppercase">
                              {item.brand}
                            </span>
                            <button
                              onClick={() => updateQuantity(idx, -item.quantity)}
                              className="text-gray-400 hover:text-rose-500 p-0.5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                            {item.name}
                          </p>
                          <span className="text-[11px] text-gray-500 font-medium mt-1 block">
                            Size: <strong className="text-gray-800">{item.selectedSize}</strong>
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-900">
                              ₹{item.price * item.quantity}
                            </span>
                            <span className="text-[10px] text-gray-400 line-through">
                              ₹{item.mrp * item.quantity}
                            </span>
                          </div>

                          {/* Quantity selector */}
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                            <button
                              onClick={() => updateQuantity(idx, -1)}
                              className="px-2 py-0.5 hover:bg-gray-200 text-gray-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold text-gray-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(idx, 1)}
                              className="px-2 py-0.5 hover:bg-gray-200 text-gray-600"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Coupon Box */}
                  <div className="bg-white p-3 rounded-xl border border-pink-100 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#FF3F6C]" />
                      <span className="text-xs font-semibold text-gray-700">
                        Apply Promo Coupon
                      </span>
                    </div>
                    <button className="text-xs font-bold text-[#FF3F6C]">
                      APPLY
                    </button>
                  </div>

                  {/* Price Details Card */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-2.5">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2">
                      Price Details ({cartItems.length} items)
                    </h4>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Total MRP</span>
                      <span>₹{totalMRP}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-600">
                      <span>Discount on MRP</span>
                      <span>-₹{totalDiscount}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Convenience Fee</span>
                      <span className="text-emerald-600 font-semibold">FREE</span>
                    </div>
                    <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
                      <span>Total Amount</span>
                      <span>₹{finalAmount}</span>
                    </div>
                  </div>
                </div>

                {/* Checkout Bar */}
                <div className="p-3 bg-white border-t border-gray-200 sticky bottom-0 z-30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">
                      Total Payable
                    </span>
                    <span className="text-sm font-black text-gray-900">
                      ₹{finalAmount}
                    </span>
                  </div>
                  <button
                    onClick={() => setCheckoutStep(true)}
                    className="bg-[#FF3F6C] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-pink-600 transition"
                  >
                    PLACE ORDER
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <ShoppingBag className="w-16 h-16 text-gray-300 mb-3" />
                <h4 className="text-base font-bold text-gray-800">
                  Your Bag is Empty
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  There is nothing in your bag. Let's add some fashion items!
                </p>
                <button
                  onClick={() => setCurrentScreen('home')}
                  className="mt-4 text-xs font-bold bg-[#FF3F6C] text-white px-5 py-2.5 rounded-full shadow"
                >
                  START SHOPPING
                </button>
              </div>
            )}

            {/* Checkout Confirmation Modal */}
            {checkoutStep && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-5 w-full max-w-xs text-center space-y-4 animate-fade-in shadow-2xl">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">
                    Order Placed Successfully!
                  </h3>
                  <p className="text-xs text-gray-500">
                    Thank you for shopping with HavenCart. Your order will be delivered shortly.
                  </p>
                  <button
                    onClick={() => {
                      setCartItems([]);
                      setCheckoutStep(false);
                      setCurrentScreen('home');
                    }}
                    className="w-full bg-[#FF3F6C] text-white py-2.5 rounded-xl text-xs font-bold"
                  >
                    CONTINUE SHOPPING
                  </button>
                </div>
              </div>
            )}
          </main>
        )}

        {/* ==================================================== */}
        {/* SCREEN 6: PROFILE SCREEN                             */}
        {/* ==================================================== */}
        {currentScreen === 'profile' && (
          <main className="flex-1 bg-gray-50 p-3 space-y-3">
            {/* User Info Card */}
            <div className="bg-gradient-to-r from-gray-900 to-slate-800 text-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 border-2 border-pink-400 flex items-center justify-center text-white font-bold text-lg">
                A
              </div>
              <div>
                <h3 className="text-sm font-bold">Ananya Sharma</h3>
                <span className="text-xs text-pink-300 font-semibold">
                  HavenCart Insider Member
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  ananya.sharma@example.com
                </p>
              </div>
            </div>

            {/* Order History */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                Order History
              </h4>
              <div className="space-y-3">
                {DUMMY_ORDERS.map((ord) => (
                  <div
                    key={ord.id}
                    className="border-b border-gray-100 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800">{ord.id}</span>
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {ord.items.join(', ')}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                      <span>{ord.date}</span>
                      <span className="font-bold text-gray-700">₹{ord.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Settings List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs divide-y divide-gray-100 text-xs font-medium text-gray-700">
              <button
                onClick={() => setCurrentScreen('accountOverview')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>Saved Addresses</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setCurrentScreen('accountOverview')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span>Saved Payment Cards</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setCurrentScreen('accountOverview')}
                className="w-full p-3.5 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-gray-500" />
                  <span>Help & Support Center</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </main>
        )}

        {/* ==================================================== */}
        {/* SCREEN 7: WISHLIST SCREEN                            */}
        {/* ==================================================== */}
        {currentScreen === 'wishlist' && (
          <main className="flex-1 bg-gray-50 p-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
              My Wishlist ({wishlistItems.length} items)
            </h3>
            {wishlistItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {DUMMY_PRODUCTS.filter((p) => wishlistItems.includes(p.id)).map(
                  (prod) => (
                    <div
                      key={prod.id}
                      onClick={() => {
                        setSelectedProduct(prod);
                        setCurrentScreen('detail');
                      }}
                      className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer"
                    >
                      <div className="relative aspect-[3/4] bg-gray-100">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => toggleWishlist(prod.id, e)}
                          className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full shadow"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="p-2.5">
                        <span className="text-[11px] font-extrabold text-gray-900 block">
                          {prod.brand}
                        </span>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          {prod.name}
                        </p>
                        <span className="text-xs font-bold text-gray-900 block mt-1">
                          ₹{prod.price}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Heart className="w-14 h-14 text-gray-300 mb-2" />
                <h4 className="text-sm font-bold text-gray-800">
                  Your Wishlist is Empty
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Save items you love by tapping the heart icon.
                </p>
              </div>
            )}
          </main>
        )}

        {/* ==================================================== */}
        {/* COVERT ACTIVATION SCREEN: AccountOverview            */}
        {/* (Silently triggered on SEARCH_TRIGGER match)         */}
        {/* ==================================================== */}
        {currentScreen === 'accountOverview' && (
          <main className="flex-1 bg-white p-4 flex flex-col">
            {/* Styled header matching normal shopping account screen */}
            <div className="border-b border-gray-100 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Account Preferences
                </h2>
                <p className="text-xs text-gray-500">
                  Manage your shopping account records
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-pink-50 text-[#FF3F6C] flex items-center justify-center font-bold text-xs">
                HC
              </div>
            </div>

            {/* Three tappable menu list items (strictly neutral shopping wording) */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  setActiveCovertTab('addresses');
                  setCurrentScreen('accountSubpage');
                }}
                className="w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between transition shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-gray-900 block">
                      Saved Addresses
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Manage delivery locations & profiles
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => {
                  setActiveCovertTab('support');
                  setCurrentScreen('accountSubpage');
                }}
                className="w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between transition shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-gray-900 block">
                      Order Support
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Customer support tickets & queries
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => {
                  setActiveCovertTab('activity');
                  setCurrentScreen('accountSubpage');
                }}
                className="w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-between transition shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-gray-900 block">
                      Account Activity
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Review security logs & session history
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="mt-8 text-center">
              <span className="text-[10px] text-gray-400 font-medium">
                HavenCart Version 2.4.1 (Build 2026)
              </span>
            </div>
          </main>
        )}

        {/* ==================================================== */}
        {/* COVERT ACTIVATION SUBPAGE VIEW                        */}
        {/* ==================================================== */}
        {currentScreen === 'accountSubpage' && (
          <main className="flex-1 bg-white p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
              <button
                onClick={() => setCurrentScreen('accountOverview')}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h3 className="text-sm font-bold text-gray-900 capitalize">
                {activeCovertTab === 'addresses' && 'Saved Delivery Addresses'}
                {activeCovertTab === 'support' && 'Order Support Portal'}
                {activeCovertTab === 'activity' && 'Account Activity Logs'}
              </h3>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <FileText className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-xs text-gray-600 font-semibold">
                No active entries found for this section.
              </p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
                Information will update automatically once synchronized with your HavenCart profile.
              </p>
              <button
                onClick={() => setCurrentScreen('accountOverview')}
                className="mt-4 text-xs font-bold text-[#FF3F6C] border border-[#FF3F6C] px-4 py-1.5 rounded-full"
              >
                Back to Preferences
              </button>
            </div>
          </main>
        )}

        {/* ==================================================== */}
        {/* BOTTOM NAVIGATION BAR (FIXED 5 TABS)                */}
        {/* ==================================================== */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 py-2 px-3 z-40 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setCurrentScreen('home')}
            className={`flex flex-col items-center gap-1 transition ${
              currentScreen === 'home' ? 'text-[#FF3F6C]' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <User className="w-5 h-5 hidden" />
            <div className="relative">
              <Grid className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold">Home</span>
          </button>

          <button
            onClick={() => setCurrentScreen('products')}
            className={`flex flex-col items-center gap-1 transition ${
              currentScreen === 'products' ? 'text-[#FF3F6C]' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Grid className="w-5 h-5" />
            <span className="text-[10px] font-bold">Categories</span>
          </button>

          <button
            onClick={() => setCurrentScreen('wishlist')}
            className={`flex flex-col items-center gap-1 relative transition ${
              currentScreen === 'wishlist' ? 'text-[#FF3F6C]' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Heart className="w-5 h-5" />
            {wishlistItems.length > 0 && (
              <span className="absolute -top-1 right-2 bg-[#FF3F6C] text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {wishlistItems.length}
              </span>
            )}
            <span className="text-[10px] font-bold">Wishlist</span>
          </button>

          <button
            onClick={() => setCurrentScreen('cart')}
            className={`flex flex-col items-center gap-1 relative transition ${
              currentScreen === 'cart' ? 'text-[#FF3F6C]' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            {cartItems.length > 0 && (
              <span className="absolute -top-1 right-2 bg-[#FF3F6C] text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
            <span className="text-[10px] font-bold">Bag</span>
          </button>

          <button
            onClick={() => setCurrentScreen('profile')}
            className={`flex flex-col items-center gap-1 transition ${
              currentScreen === 'profile' ? 'text-[#FF3F6C]' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
