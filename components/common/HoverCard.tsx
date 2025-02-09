'use client';
import React from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import Link from "next/link";
import { motion } from "framer-motion";

const NameHoverCard = () => {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Link href="/" className="font-semibold">
          <motion.span
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent"
            animate={{
              backgroundPosition: ["0%", "100%", "0%"],
            }}
            transition={{
              duration: 5,
              ease: "linear",
              repeat: Infinity,
            }}
            style={{
              backgroundSize: "300% 300%",
            }}
          >
            AlexandrAI
          </motion.span>
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <div className="flex items-center justify-between">
          <span className="text-xl">🛠️</span>
          <p className="text-sm px-2">
            Name needs to be redesigned, I'm a developer not a product designer
          </p>
          <span className="text-xl">🥹</span>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default NameHoverCard;