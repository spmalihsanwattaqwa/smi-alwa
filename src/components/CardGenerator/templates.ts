import { CardTemplateType } from './types';

export interface TemplateStyle {
  id: CardTemplateType;
  name: string;
  description: string;
  bgFront: string;
  bgBack: string;
  textColor: string;
  accentColor: string;
  headerBg?: string;
  headerHex?: string;
  bgFrontHex?: string;
  bgBackHex?: string;
  footerBg?: string;
  fontFamily: string;
}

export const TEMPLATES: TemplateStyle[] = [
  {
    id: 'modern',
    name: 'Modern Dynamic',
    description: 'Desain modern dengan gradien dinamis dan layout bersih.',
    bgFront: 'bg-white',
    bgFrontHex: '#ffffff',
    bgBack: 'bg-slate-900',
    bgBackHex: '#0f172a',
    textColor: 'text-slate-800',
    accentColor: 'text-blue-600',
    headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-700',
    headerHex: '#2563eb', // Fallback or primary for the gradient
    fontFamily: 'font-sans'
  },
  {
    id: 'islamic',
    name: 'Islamic Premium',
    description: 'Nuansa Islami dengan pattern geometris dan warna emerald.',
    bgFront: 'bg-[#fcfdfa]',
    bgFrontHex: '#fcfdfa',
    bgBack: 'bg-[#064e3b]',
    bgBackHex: '#064e3b',
    textColor: 'text-[#064e3b]',
    accentColor: 'text-emerald-600',
    headerBg: 'bg-[#064e3b]',
    headerHex: '#064e3b',
    fontFamily: 'font-sans'
  },
  {
    id: 'corporate',
    name: 'Corporate Professional',
    description: 'Tampilan formal dan kaku untuk instansi resmi.',
    bgFront: 'bg-white',
    bgFrontHex: '#ffffff',
    bgBack: 'bg-[#1e293b]',
    bgBackHex: '#1e293b',
    textColor: 'text-[#1e293b]',
    accentColor: 'text-blue-800',
    headerBg: 'bg-[#1e3a8a]',
    headerHex: '#1e3a8a',
    fontFamily: 'font-sans'
  },
  {
    id: 'luxury',
    name: 'Luxury Gold',
    description: 'Eksklusif dengan aksen emas dan latar belakang gelap.',
    bgFront: 'bg-white',
    bgFrontHex: '#ffffff',
    bgBack: 'bg-black',
    bgBackHex: '#000000',
    textColor: 'text-slate-900',
    accentColor: 'text-yellow-600',
    headerBg: 'bg-gradient-to-r from-yellow-600 to-amber-500',
    headerHex: '#ca8a04',
    fontFamily: 'font-serif'
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Efek kaca transparan yang sedang tren.',
    bgFront: 'bg-white',
    bgFrontHex: '#ffffff',
    bgBack: 'bg-slate-200',
    bgBackHex: '#e2e8f0',
    textColor: 'text-slate-900',
    accentColor: 'text-cyan-600',
    headerBg: 'bg-cyan-500',
    headerHex: '#06b6d4',
    fontFamily: 'font-sans'
  },
  {
    id: 'dark',
    name: 'Midnight Dark',
    description: 'Elegan dengan dominasi warna gelap dan teks kontras.',
    bgFront: 'bg-slate-900',
    bgFrontHex: '#0f172a',
    bgBack: 'bg-black',
    bgBackHex: '#000000',
    textColor: 'text-slate-100',
    accentColor: 'text-indigo-400',
    headerBg: 'bg-indigo-900',
    headerHex: '#312e81',
    fontFamily: 'font-mono'
  }
];
