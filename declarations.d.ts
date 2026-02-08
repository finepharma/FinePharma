// Type declarations for JSX modules

declare module '*.jsx' {
  const content: any;
  export default content;
}

declare module '@/context/AuthContext' {
  import { FC, ReactNode } from 'react';
  export const AuthProvider: FC<{ children: ReactNode }>;
  export const useAuth: () => any;
}

declare module '@/guards/RouteGuard' {
  import { FC, ReactNode } from 'react';
  export const RequireAuth: FC<{ children: ReactNode }>;
  export const RequireRole: FC<{ children: ReactNode; allowedRoles: string[] }>;
  export const PublicOnly: FC<{ children: ReactNode }>;
  export const HomeAccess: FC<{ children: ReactNode }>;
  export const AuthLoadingScreen: FC;
}

declare module '@/pages/Login' {
  const Login: React.FC;
  export default Login;
}

declare module '@/pages/Home' {
  const Home: React.FC;
  export default Home;
}

declare module '@/pages/AdminDashboard' {
  const AdminDashboard: React.FC;
  export default AdminDashboard;
}

declare module '@/pages/StaffDashboard' {
  const StaffDashboard: React.FC;
  export default StaffDashboard;
}

declare module '@/components/invoice/InvoiceGenerator' {
  interface InvoiceGeneratorProps {
    orderId?: string;
    onBack?: () => void;
  }
  const InvoiceGenerator: React.FC<InvoiceGeneratorProps>;
  export default InvoiceGenerator;
}

// Relative path declarations
declare module './context/AuthContext' {
  export * from '@/context/AuthContext';
}

declare module './guards/RouteGuard' {
  export * from '@/guards/RouteGuard';
}

declare module './pages/Login' {
  export { default } from '@/pages/Login';
}

declare module './pages/Home' {
  export { default } from '@/pages/Home';
}

declare module './pages/AdminDashboard' {
  export { default } from '@/pages/AdminDashboard';
}

declare module './pages/StaffDashboard' {
  export { default } from '@/pages/StaffDashboard';
}

declare module './components/invoice/InvoiceGenerator' {
  export { default } from '@/components/invoice/InvoiceGenerator';
}
