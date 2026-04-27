export type Business = {
  id: string;
  name: string;
  category: string;
  reviews: number;
  rating: number;
  hasWeb: boolean;
  score: number;
  postalCode: string;
  city: string;
  phone: string;
  address: string;
  email: string;
  website?: string;
};

export const businesses: Business[] = [
  { id: "1", name: "Panadería La Espiga", category: "Panadería", reviews: 142, rating: 4.6, hasWeb: false, score: 87, postalCode: "28013", city: "Madrid", phone: "+34 911 234 567", address: "Calle Mayor 12", email: "contacto@laespiga.es" },
  { id: "2", name: "Cafetería Central", category: "Cafetería", reviews: 320, rating: 4.4, hasWeb: true, score: 62, postalCode: "28013", city: "Madrid", phone: "+34 912 555 010", address: "Plaza Sol 3", email: "hola@cafecentral.es", website: "cafecentral.es" },
  { id: "3", name: "Auto Taller Pérez", category: "Mecánico", reviews: 58, rating: 4.8, hasWeb: false, score: 91, postalCode: "08001", city: "Barcelona", phone: "+34 933 010 200", address: "Av. Diagonal 88", email: "info@tallerperez.com" },
  { id: "4", name: "Floristería Aroma", category: "Floristería", reviews: 87, rating: 4.7, hasWeb: false, score: 78, postalCode: "28013", city: "Madrid", phone: "+34 914 333 221", address: "Calle Flores 9", email: "ventas@aroma.es" },
  { id: "5", name: "Clínica Dental Sonrisa", category: "Salud", reviews: 215, rating: 4.9, hasWeb: true, score: 54, postalCode: "46001", city: "Valencia", phone: "+34 961 222 333", address: "Av. del Puerto 45", email: "citas@sonrisa.es", website: "clinicasonrisa.es" },
  { id: "6", name: "Peluquería Estilo", category: "Belleza", reviews: 96, rating: 4.3, hasWeb: false, score: 82, postalCode: "28013", city: "Madrid", phone: "+34 915 444 100", address: "Calle Luna 22", email: "estilo@hola.es" },
  { id: "7", name: "Restaurante El Olivo", category: "Restaurante", reviews: 540, rating: 4.5, hasWeb: true, score: 71, postalCode: "29001", city: "Málaga", phone: "+34 952 100 200", address: "Paseo Marítimo 14", email: "reservas@elolivo.es", website: "elolivo.es" },
  { id: "8", name: "Tienda de Mascotas Patitas", category: "Mascotas", reviews: 73, rating: 4.7, hasWeb: false, score: 88, postalCode: "28013", city: "Madrid", phone: "+34 916 777 888", address: "Calle Pez 5", email: "patitas@correo.es" },
  { id: "9", name: "Gimnasio FitZone", category: "Deporte", reviews: 412, rating: 4.2, hasWeb: true, score: 49, postalCode: "41001", city: "Sevilla", phone: "+34 954 600 700", address: "Av. Reina 60", email: "info@fitzone.es", website: "fitzone.es" },
  { id: "10", name: "Librería Letras", category: "Librería", reviews: 64, rating: 4.8, hasWeb: false, score: 84, postalCode: "28013", city: "Madrid", phone: "+34 917 888 999", address: "Calle Libros 3", email: "letras@correo.es" },
  { id: "11", name: "Pastelería Dulce", category: "Pastelería", reviews: 188, rating: 4.6, hasWeb: false, score: 79, postalCode: "08001", city: "Barcelona", phone: "+34 934 010 020", address: "Calle Aribau 22", email: "dulce@correo.es" },
  { id: "12", name: "Estudio Yoga Zen", category: "Bienestar", reviews: 102, rating: 4.9, hasWeb: false, score: 90, postalCode: "28013", city: "Madrid", phone: "+34 918 121 314", address: "Calle Calma 8", email: "zen@yoga.es" },
  { id: "13", name: "Joyería Brillo", category: "Joyería", reviews: 39, rating: 4.5, hasWeb: true, score: 58, postalCode: "46001", city: "Valencia", phone: "+34 962 555 666", address: "Calle Colón 30", email: "brillo@joyas.es", website: "brillo.es" },
  { id: "14", name: "Carpintería Madera Viva", category: "Servicios", reviews: 27, rating: 4.7, hasWeb: false, score: 76, postalCode: "29001", city: "Málaga", phone: "+34 952 333 444", address: "Polígono Sur 11", email: "info@maderaviva.es" },
  { id: "15", name: "Heladería Polo Norte", category: "Heladería", reviews: 256, rating: 4.4, hasWeb: false, score: 81, postalCode: "28013", city: "Madrid", phone: "+34 919 202 020", address: "Calle Hielo 1", email: "polo@norte.es" },
];
