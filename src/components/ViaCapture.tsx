"use client";
import { useEffect } from "react";
import { captureVia } from "@/lib/via";
export default function ViaCapture() { useEffect(() => { captureVia(); }, []); return null; }
