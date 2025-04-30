// components/header/NavMenu.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, BarChart, User, Settings } from 'lucide-react';

export default function NavMenu() {
  const pathname = usePathname();
  
  const isActive = (path: string) => pathname === path;
  
  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      <Link 
        href="/protected/convert" 
        className={`flex items-center ${
          isActive('/protected/convert') 
            ? 'text-primary font-medium' 
            : 'text-muted-foreground hover:text-primary'
        }`}
      >
        <FileText className="mr-2 h-4 w-4" />
        <span>Convert</span>
      </Link>
      
      <Link 
        href="/protected/library" 
        className={`flex items-center ${
          isActive('/protected/library') 
            ? 'text-primary font-medium' 
            : 'text-muted-foreground hover:text-primary'
        }`}
      >
        <BarChart className="mr-2 h-4 w-4" />
        <span>Library</span>
      </Link>
      
      <Link 
        href="/protected/subscription" 
        className={`flex items-center ${
          isActive('/protected/subscription') 
            ? 'text-primary font-medium' 
            : 'text-muted-foreground hover:text-primary'
        }`}
      >
        <Settings className="mr-2 h-4 w-4" />
        <span>Subscription</span>
      </Link>
      
      <Link 
        href="/protected/account" 
        className={`flex items-center ${
          isActive('/protected/account') 
            ? 'text-primary font-medium' 
            : 'text-muted-foreground hover:text-primary'
        }`}
      >
        <User className="mr-2 h-4 w-4" />
        <span>Account</span>
      </Link>
    </nav>
  );
}