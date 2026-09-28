import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { joinWaitlist } from "~/lib/waitlist-api";
import { Logo } from "~/components/Logo";
import { Icon } from "~/components/Icon";
import {
  HandDivider,
  SketchUnderline,
  Sprig,
  PageTurn,
} from "~/components/Warm";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

/* ── The three quiet steps of how Family Core works ─────────────────── */
const HOW_IT_WORKS = [
  {
    icon: "reminder" as const,
    title: "We notice the silence",
    body: "Thirty days without a word, and we gently flag the relationship — nothing more. Frequency, recency and who reaches out first. Never what you said.",
  },
  {
    icon: "nudge" as const,
    title: "We nudge, gently",
    body: "One warm prompt to reach out. No streak counters, no badges, no notification storm — a single note, and then quiet.",
  },
  {
    icon: "heart" as const,
    title: "You reconnect for real",
    body: "You make the call, send the letter, take the walk. The app steps back and the bond grows stronger. That is the whole point.",
  },
];

/* ── A warm illustrated album card (no stock photography, per spec §8) ── */
function AlbumIllustration() {
  return (
    <figure className="fh-card-soft m-0 overflow-hidden p-0">
      <svg
        viewBox="0 0 360 200"
        className="block h-auto w-full"
        role="img"
        aria-label="Illustration of an older hand and a younger hand, clasped together"
      >
        <title>
          An older hand and a younger hand, clasped together — a grandparent and
          grandchild, drawn in soft pencil.
        </title>
        <desc>
          Hand-drawn pencil illustration: a weathered, lined older hand gently
          clasps a younger hand in the centre — soft graphite hatching over bold
          terracotta and forest-green colour blocks with a sandy beige diamond,
          on a warm cream ground.
        </desc>
        <defs>
          <clipPath id="hero-clip-oldpalm">
            <path d="M76 200 C 78 180, 84 158, 96 140 C 106 124, 120 110, 138 102 C 162 92, 192 92, 214 99 C 228 103, 236 110, 239 122 C 240 134, 238 148, 236 160 C 234 174, 232 188, 230 200 Z" />
          </clipPath>
          <clipPath id="hero-clip-younpalm">
            <path d="M318 200 C 312 186, 302 172, 290 162 C 276 152, 262 142, 254 130 C 248 121, 246 112, 249 104 C 256 96, 272 93, 288 96 C 302 99, 312 106, 318 116 C 324 128, 326 148, 326 170 L326 200 Z" />
          </clipPath>
          <clipPath id="hero-clip-oldthumb">
            <path d="M106 196 C 112 176, 124 158, 140 148 C 158 137, 180 130, 200 130 C 218 130, 232 132, 244 138 C 250 140, 252 144, 250 148 C 246 156, 232 158, 218 156 C 202 154, 186 156, 174 162 C 162 168, 154 176, 150 186 C 148 190, 148 194, 149 198 Z" />
          </clipPath>
          <clipPath id="hero-clip-d1">
            <polygon points="131.7,111.3 131.2,105.5 130.8,100.0 130.5,94.7 130.4,89.6 130.3,84.8 130.3,80.2 130.5,75.9 130.7,71.8 131.1,67.9 131.6,64.3 132.1,61.0 132.8,57.9 133.5,55.1 134.3,52.6 119.7,47.4 118.6,50.8 117.7,54.4 116.9,58.2 116.2,62.1 115.7,66.2 115.3,70.6 115.0,75.1 114.8,79.9 114.8,84.8 114.9,90.0 115.0,95.4 115.3,100.9 115.8,106.7 116.3,112.7" />
          </clipPath>
          <clipPath id="hero-clip-l1">
            <polygon points="152.2,117.6 151.8,111.2 151.5,105.0 151.1,99.1 150.9,93.5 150.6,88.2 150.4,83.1 150.2,78.3 150.1,73.8 150.0,69.5 150.0,65.5 150.0,61.8 150.0,58.4 150.1,55.2 150.2,52.3 137.8,51.7 137.6,54.8 137.5,58.1 137.5,61.7 137.5,65.6 137.5,69.7 137.6,74.1 137.8,78.7 137.9,83.6 138.1,88.7 138.4,94.1 138.7,99.8 139.0,105.7 139.4,111.9 139.8,118.4" />
          </clipPath>
          <clipPath id="hero-clip-d2">
            <polygon points="175.7,108.6 175.5,102.7 175.3,97.0 175.3,91.5 175.3,86.2 175.3,81.2 175.5,76.3 175.7,71.7 176.1,67.4 176.4,63.2 176.9,59.3 177.4,55.6 178.1,52.2 178.7,49.0 179.5,46.0 164.5,42.0 163.6,45.5 162.8,49.2 162.1,53.2 161.5,57.3 161.0,61.6 160.6,66.1 160.3,70.8 160.0,75.7 159.8,80.8 159.8,86.1 159.8,91.6 159.8,97.3 160.0,103.2 160.3,109.4" />
          </clipPath>
          <clipPath id="hero-clip-l2">
            <polygon points="196.2,113.6 195.8,107.3 195.4,101.2 195.0,95.3 194.7,89.6 194.4,84.2 194.0,78.9 193.7,73.9 193.5,69.1 193.2,64.5 193.0,60.1 192.8,55.9 192.6,52.0 192.4,48.3 192.2,44.7 179.8,45.3 179.9,48.8 180.1,52.6 180.3,56.6 180.5,60.8 180.7,65.2 181.0,69.8 181.3,74.6 181.6,79.7 181.9,84.9 182.2,90.4 182.6,96.1 182.9,102.0 183.3,108.1 183.8,114.4" />
          </clipPath>
          <clipPath id="hero-clip-d3">
            <polygon points="219.8,108.0 219.8,102.0 219.8,96.3 219.9,90.7 220.1,85.4 220.3,80.3 220.5,75.4 220.7,70.7 221.0,66.3 221.4,62.1 221.8,58.1 222.2,54.3 222.6,50.8 223.1,47.5 223.6,44.4 208.4,41.6 207.8,45.0 207.3,48.7 206.8,52.5 206.3,56.5 205.9,60.7 205.6,65.1 205.3,69.8 205.0,74.6 204.8,79.7 204.6,84.9 204.4,90.4 204.3,96.0 204.3,101.9 204.2,108.0" />
          </clipPath>
          <clipPath id="hero-clip-l3">
            <polygon points="240.2,111.6 239.8,105.3 239.4,99.2 239.0,93.3 238.7,87.7 238.4,82.3 238.0,77.1 237.7,72.1 237.5,67.4 237.2,62.9 237.0,58.6 236.8,54.5 236.6,50.7 236.4,47.1 236.2,43.7 223.8,44.3 223.9,47.7 224.1,51.3 224.3,55.2 224.5,59.3 224.7,63.6 225.0,68.1 225.3,72.9 225.6,77.8 225.9,83.0 226.2,88.5 226.6,94.1 226.9,100.0 227.3,106.1 227.8,112.4" />
          </clipPath>
          <clipPath id="hero-clip-d4">
            <polygon points="257.7,112.4 258.0,106.2 258.4,100.3 258.7,94.7 259.0,89.3 259.4,84.1 259.8,79.2 260.2,74.5 260.6,70.0 261.1,65.8 261.6,61.8 262.1,58.1 262.6,54.6 263.1,51.4 263.6,48.5 248.4,45.5 247.8,48.8 247.2,52.3 246.7,56.0 246.2,59.9 245.7,64.1 245.2,68.4 244.8,73.0 244.4,77.9 244.0,82.9 243.6,88.2 243.2,93.7 242.9,99.5 242.6,105.4 242.3,111.6" />
          </clipPath>
          <clipPath id="hero-clip-l4">
            <polygon points="270.2,117.3 269.5,111.0 268.9,105.0 268.3,99.2 267.8,93.7 267.3,88.4 266.9,83.3 266.5,78.5 266.2,74.0 265.9,69.7 265.6,65.6 265.5,61.8 265.3,58.3 265.3,55.0 265.2,52.0 252.8,52.0 252.8,55.2 252.9,58.7 253.0,62.4 253.2,66.3 253.4,70.4 253.7,74.8 254.0,79.5 254.4,84.3 254.8,89.5 255.3,94.8 255.9,100.4 256.5,106.3 257.1,112.4 257.8,118.7" />
          </clipPath>
        </defs>
        <rect width="360" height="200" fill="#F5F0EB" />
        {/* bold flat colour blocks: terracotta diamond (warmth), forest triangle, sand diamond */}
        <polygon points="74,-18 152,60 74,138 -4,60" fill="#D4845A" />
        <polygon points="196,200 388,-50 388,200" fill="#3A6B4A" />
        <polygon points="262,80 314,132 262,184 210,132" fill="#E8D5C0" />

        {/* stray pencil marks */}
        <line
          x1="18.0"
          y1="182.0"
          x2="34.0"
          y2="188.0"
          stroke="#1A1A1A"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.08"
        />
        <line
          x1="328.0"
          y1="52.0"
          x2="344.0"
          y2="58.0"
          stroke="#1A1A1A"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.08"
        />
        <line
          x1="58.0"
          y1="62.0"
          x2="70.0"
          y2="58.0"
          stroke="#1A1A1A"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.07"
        />
        <line
          x1="312.0"
          y1="188.0"
          x2="330.0"
          y2="184.0"
          stroke="#1A1A1A"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.09"
        />
        <line
          x1="30.0"
          y1="40.0"
          x2="44.0"
          y2="34.0"
          stroke="#1A1A1A"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.07"
        />
        {/* young hand: smooth, light, spare */}
        <path
          d="M318 200 C 312 186, 302 172, 290 162 C 276 152, 262 142, 254 130 C 248 121, 246 112, 249 104 C 256 96, 272 93, 288 96 C 302 99, 312 106, 318 116 C 324 128, 326 148, 326 170 L326 200 Z"
          fill="#F0E4D3"
          opacity="0.5"
          stroke="#1A1A1A"
          strokeOpacity="0.2"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M318 200 C 312 186, 302 172, 290 162 C 276 152, 262 142, 254 130 C 248 121, 246 112, 249 104 C 256 96, 272 93, 288 96 C 302 99, 312 106, 318 116 C 324 128, 326 148, 326 170 L326 200 Z"
          fill="none"
          stroke="#1A1A1A"
          strokeOpacity="0.07"
          strokeWidth="1.8"
          transform="translate(2 1)"
        />
        <path
          d="M 146.0 118.0 Q 143.0 72.0, 144.0 52.0"
          stroke="#F0E4D3"
          strokeOpacity="0.55"
          strokeWidth="12.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 146.0 118.0 Q 143.0 72.0, 144.0 52.0"
          stroke="#1A1A1A"
          strokeOpacity="0.16"
          strokeWidth="13.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="143.8" cy="57.2" r="2.2" fill="#F0E4D3" opacity="0.5" />
        <path
          d="M 190.0 114.0 Q 187.0 69.0, 186.0 45.0"
          stroke="#F0E4D3"
          strokeOpacity="0.55"
          strokeWidth="12.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 190.0 114.0 Q 187.0 69.0, 186.0 45.0"
          stroke="#1A1A1A"
          strokeOpacity="0.16"
          strokeWidth="13.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="186.3" cy="51.1" r="2.2" fill="#F0E4D3" opacity="0.5" />
        <path
          d="M 234.0 112.0 Q 231.0 67.0, 230.0 44.0"
          stroke="#F0E4D3"
          strokeOpacity="0.55"
          strokeWidth="12.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 234.0 112.0 Q 231.0 67.0, 230.0 44.0"
          stroke="#1A1A1A"
          strokeOpacity="0.16"
          strokeWidth="13.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="230.3" cy="49.8" r="2.2" fill="#F0E4D3" opacity="0.5" />
        <path
          d="M 264.0 118.0 Q 259.0 73.0, 259.0 52.0"
          stroke="#F0E4D3"
          strokeOpacity="0.55"
          strokeWidth="12.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 264.0 118.0 Q 259.0 73.0, 259.0 52.0"
          stroke="#1A1A1A"
          strokeOpacity="0.16"
          strokeWidth="13.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="259.1" cy="57.4" r="2.2" fill="#F0E4D3" opacity="0.5" />
        <g clipPath="url(#hero-clip-younpalm)">
          <line
            x1="134.0"
            y1="60.0"
            x2="194.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="145.0"
            y1="60.0"
            x2="205.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="156.0"
            y1="60.0"
            x2="216.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="167.0"
            y1="60.0"
            x2="227.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="178.0"
            y1="60.0"
            x2="238.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="189.0"
            y1="60.0"
            x2="249.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="200.0"
            y1="60.0"
            x2="260.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="211.0"
            y1="60.0"
            x2="271.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="222.0"
            y1="60.0"
            x2="282.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="233.0"
            y1="60.0"
            x2="293.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="244.0"
            y1="60.0"
            x2="304.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="255.0"
            y1="60.0"
            x2="315.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="266.0"
            y1="60.0"
            x2="326.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="277.0"
            y1="60.0"
            x2="337.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="288.0"
            y1="60.0"
            x2="348.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="299.0"
            y1="60.0"
            x2="359.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="310.0"
            y1="60.0"
            x2="370.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="321.0"
            y1="60.0"
            x2="381.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="332.0"
            y1="60.0"
            x2="392.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="343.0"
            y1="60.0"
            x2="403.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="354.0"
            y1="60.0"
            x2="414.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
          <line
            x1="365.0"
            y1="60.0"
            x2="425.0"
            y2="120.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.08"
          />
        </g>
        {/* old hand: weathered, lined, heavily hatched */}
        <path
          d="M76 200 C 78 180, 84 158, 96 140 C 106 124, 120 110, 138 102 C 162 92, 192 92, 214 99 C 228 103, 236 110, 239 122 C 240 134, 238 148, 236 160 C 234 174, 232 188, 230 200 Z"
          fill="#1A1A1A"
          fillOpacity="0.66"
          stroke="#1A1A1A"
          strokeOpacity="0.6"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M76 200 C 78 180, 84 158, 96 140 C 106 124, 120 110, 138 102 C 162 92, 192 92, 214 99 C 228 103, 236 110, 239 122 C 240 134, 238 148, 236 160 C 234 174, 232 188, 230 200 Z"
          fill="none"
          stroke="#1A1A1A"
          strokeOpacity="0.08"
          strokeWidth="1.8"
          transform="translate(-2 1)"
        />
        <g clipPath="url(#hero-clip-oldpalm)">
          <line
            x1="24.0"
            y1="60.0"
            x2="-16.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="31.0"
            y1="60.0"
            x2="-9.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="38.0"
            y1="60.0"
            x2="-2.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="45.0"
            y1="60.0"
            x2="5.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="52.0"
            y1="60.0"
            x2="12.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="59.0"
            y1="60.0"
            x2="19.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="66.0"
            y1="60.0"
            x2="26.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="73.0"
            y1="60.0"
            x2="33.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="80.0"
            y1="60.0"
            x2="40.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="87.0"
            y1="60.0"
            x2="47.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="94.0"
            y1="60.0"
            x2="54.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="101.0"
            y1="60.0"
            x2="61.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="108.0"
            y1="60.0"
            x2="68.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="115.0"
            y1="60.0"
            x2="75.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="122.0"
            y1="60.0"
            x2="82.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="129.0"
            y1="60.0"
            x2="89.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="136.0"
            y1="60.0"
            x2="96.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="143.0"
            y1="60.0"
            x2="103.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="150.0"
            y1="60.0"
            x2="110.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="157.0"
            y1="60.0"
            x2="117.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="164.0"
            y1="60.0"
            x2="124.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="171.0"
            y1="60.0"
            x2="131.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="178.0"
            y1="60.0"
            x2="138.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="185.0"
            y1="60.0"
            x2="145.0"
            y2="180.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.16"
          />
          <line
            x1="12.0"
            y1="40.0"
            x2="72.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="20.0"
            y1="40.0"
            x2="80.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="28.0"
            y1="40.0"
            x2="88.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="36.0"
            y1="40.0"
            x2="96.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="44.0"
            y1="40.0"
            x2="104.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="52.0"
            y1="40.0"
            x2="112.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="60.0"
            y1="40.0"
            x2="120.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="68.0"
            y1="40.0"
            x2="128.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="76.0"
            y1="40.0"
            x2="136.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="84.0"
            y1="40.0"
            x2="144.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="92.0"
            y1="40.0"
            x2="152.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="100.0"
            y1="40.0"
            x2="160.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="108.0"
            y1="40.0"
            x2="168.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="116.0"
            y1="40.0"
            x2="176.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="124.0"
            y1="40.0"
            x2="184.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="132.0"
            y1="40.0"
            x2="192.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="140.0"
            y1="40.0"
            x2="200.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="148.0"
            y1="40.0"
            x2="208.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="156.0"
            y1="40.0"
            x2="216.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="164.0"
            y1="40.0"
            x2="224.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="172.0"
            y1="40.0"
            x2="232.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="180.0"
            y1="40.0"
            x2="240.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="188.0"
            y1="40.0"
            x2="248.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
          <line
            x1="196.0"
            y1="40.0"
            x2="256.0"
            y2="220.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.11"
          />
        </g>
        <path
          d="M112 148 C 130 139, 156 137, 176 141"
          fill="none"
          stroke="#1A1A1A"
          strokeOpacity="0.3"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M116 160 C 136 151, 160 149, 182 152"
          fill="none"
          stroke="#1A1A1A"
          strokeOpacity="0.26"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M120 172 C 140 164, 164 161, 186 164"
          fill="none"
          stroke="#1A1A1A"
          strokeOpacity="0.22"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <ellipse
          cx="126.0"
          cy="124.0"
          rx="2.2"
          ry="1.6"
          fill="#1A1A1A"
          opacity="0.3"
        />
        <ellipse
          cx="152.0"
          cy="133.0"
          rx="1.8"
          ry="1.4"
          fill="#1A1A1A"
          opacity="0.26"
        />
        <ellipse
          cx="184.0"
          cy="142.0"
          rx="2.4"
          ry="1.7"
          fill="#1A1A1A"
          opacity="0.24"
        />
        <ellipse
          cx="212.0"
          cy="152.0"
          rx="1.7"
          ry="1.3"
          fill="#1A1A1A"
          opacity="0.22"
        />
        <path
          d="M 124.0 112.0 Q 120.0 70.0, 127.0 50.0"
          stroke="#1A1A1A"
          strokeOpacity="0.5"
          strokeWidth="17.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 124.0 112.0 Q 120.0 70.0, 127.0 50.0"
          stroke="#1A1A1A"
          strokeOpacity="0.8"
          strokeWidth="15.5"
          fill="none"
          strokeLinecap="round"
        />
        <g clipPath="url(#hero-clip-d1)">
          <line
            x1="118.1"
            y1="95.7"
            x2="127.9"
            y2="102.5"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="118.1"
            y1="95.5"
            x2="127.3"
            y2="87.8"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="117.8"
            y1="80.9"
            x2="127.3"
            y2="88.3"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="117.8"
            y1="80.2"
            x2="127.6"
            y2="73.3"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="118.8"
            y1="65.4"
            x2="127.5"
            y2="73.6"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="118.7"
            y1="65.9"
            x2="129.2"
            y2="60.0"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="121.1"
            y1="52.8"
            x2="128.8"
            y2="62.0"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="122.7"
            y1="56.8"
            x2="128.8"
            y2="51.6"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="123.2"
            y1="54.5"
            x2="129.5"
            y2="49.6"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
        </g>
        <line
          x1="116.0"
          y1="88.9"
          x2="129.2"
          y2="88.6"
          stroke="#1A1A1A"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.34"
        />
        <line
          x1="116.3"
          y1="72.0"
          x2="129.5"
          y2="72.9"
          stroke="#1A1A1A"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M 168.0 109.0 Q 166.0 66.0, 172.0 44.0"
          stroke="#1A1A1A"
          strokeOpacity="0.5"
          strokeWidth="17.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 168.0 109.0 Q 166.0 66.0, 172.0 44.0"
          stroke="#1A1A1A"
          strokeOpacity="0.8"
          strokeWidth="15.5"
          fill="none"
          strokeLinecap="round"
        />
        <g clipPath="url(#hero-clip-d2)">
          <line
            x1="162.8"
            y1="92.2"
            x2="172.4"
            y2="99.4"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="162.8"
            y1="91.7"
            x2="172.2"
            y2="84.4"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="163.0"
            y1="77.0"
            x2="172.2"
            y2="84.6"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="163.0"
            y1="76.0"
            x2="172.9"
            y2="69.1"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="164.1"
            y1="60.8"
            x2="172.8"
            y2="69.1"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="164.1"
            y1="61.0"
            x2="174.4"
            y2="54.9"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="166.2"
            y1="47.6"
            x2="174.2"
            y2="56.6"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="167.9"
            y1="51.3"
            x2="173.8"
            y2="45.9"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
          <line
            x1="168.4"
            y1="48.9"
            x2="174.4"
            y2="43.6"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.3"
          />
        </g>
        <line
          x1="160.9"
          y1="85.0"
          x2="174.1"
          y2="85.2"
          stroke="#1A1A1A"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.34"
        />
        <line
          x1="161.6"
          y1="67.6"
          x2="174.8"
          y2="68.6"
          stroke="#1A1A1A"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M 212.0 108.0 Q 212.0 65.0, 216.0 43.0"
          stroke="#1A1A1A"
          strokeOpacity="0.5"
          strokeWidth="17.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 212.0 108.0 Q 212.0 65.0, 216.0 43.0"
          stroke="#1A1A1A"
          strokeOpacity="0.8"
          strokeWidth="15.5"
          fill="none"
          strokeLinecap="round"
        />
        <g clipPath="url(#hero-clip-d3)">
          <line
            x1="207.4"
            y1="91.0"
            x2="216.8"
            y2="98.5"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="207.4"
            y1="90.6"
            x2="217.1"
            y2="83.5"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="207.9"
            y1="75.9"
            x2="217.1"
            y2="83.6"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="208.0"
            y1="75.0"
            x2="217.9"
            y2="68.1"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="209.0"
            y1="59.9"
            x2="217.9"
            y2="68.0"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="209.0"
            y1="60.2"
            x2="219.2"
            y2="53.8"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="210.5"
            y1="46.8"
            x2="219.0"
            y2="55.4"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="212.5"
            y1="50.5"
            x2="218.0"
            y2="44.7"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="212.8"
            y1="48.1"
            x2="218.4"
            y2="42.4"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
        </g>
        <line
          x1="205.8"
          y1="83.9"
          x2="219.0"
          y2="84.3"
          stroke="#1A1A1A"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.34"
        />
        <line
          x1="206.6"
          y1="66.6"
          x2="219.8"
          y2="67.5"
          stroke="#1A1A1A"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M 250.0 112.0 Q 252.0 68.0, 256.0 47.0"
          stroke="#1A1A1A"
          strokeOpacity="0.5"
          strokeWidth="17.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 250.0 112.0 Q 252.0 68.0, 256.0 47.0"
          stroke="#1A1A1A"
          strokeOpacity="0.8"
          strokeWidth="15.5"
          fill="none"
          strokeLinecap="round"
        />
        <g clipPath="url(#hero-clip-d4)">
          <line
            x1="246.2"
            y1="94.5"
            x2="255.2"
            y2="102.5"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="246.2"
            y1="94.0"
            x2="256.1"
            y2="87.3"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="247.3"
            y1="79.3"
            x2="256.1"
            y2="87.3"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="247.3"
            y1="78.3"
            x2="257.4"
            y2="71.8"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="248.8"
            y1="63.3"
            x2="257.4"
            y2="71.7"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="248.8"
            y1="63.6"
            x2="259.1"
            y2="57.5"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="250.6"
            y1="50.5"
            x2="258.8"
            y2="59.1"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="252.4"
            y1="54.3"
            x2="258.0"
            y2="48.6"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
          <line
            x1="252.8"
            y1="52.0"
            x2="258.4"
            y2="46.3"
            stroke="#1A1A1A"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.34"
          />
        </g>
        <line
          x1="244.8"
          y1="87.2"
          x2="258.0"
          y2="88.1"
          stroke="#1A1A1A"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.34"
        />
        <line
          x1="246.2"
          y1="69.9"
          x2="259.4"
          y2="71.2"
          stroke="#1A1A1A"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M106 196 C 112 176, 124 158, 140 148 C 158 137, 180 130, 200 130 C 218 130, 232 132, 244 138 C 250 140, 252 144, 250 148 C 246 156, 232 158, 218 156 C 202 154, 186 156, 174 162 C 162 168, 154 176, 150 186 C 148 190, 148 194, 149 198 Z"
          fill="#1A1A1A"
          fillOpacity="0.62"
          stroke="#1A1A1A"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g clipPath="url(#hero-clip-oldthumb)">
          <line
            x1="72.0"
            y1="100.0"
            x2="52.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="79.0"
            y1="100.0"
            x2="59.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="86.0"
            y1="100.0"
            x2="66.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="93.0"
            y1="100.0"
            x2="73.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="100.0"
            y1="100.0"
            x2="80.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="107.0"
            y1="100.0"
            x2="87.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="114.0"
            y1="100.0"
            x2="94.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="121.0"
            y1="100.0"
            x2="101.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="128.0"
            y1="100.0"
            x2="108.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="135.0"
            y1="100.0"
            x2="115.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="142.0"
            y1="100.0"
            x2="122.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="149.0"
            y1="100.0"
            x2="129.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="156.0"
            y1="100.0"
            x2="136.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="163.0"
            y1="100.0"
            x2="143.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="170.0"
            y1="100.0"
            x2="150.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
          <line
            x1="177.0"
            y1="100.0"
            x2="157.0"
            y2="200.0"
            stroke="#1A1A1A"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.2"
          />
        </g>
        <path
          d="M196 196 C 198 164, 206 146, 222 140"
          fill="none"
          stroke="#1A1A1A"
          strokeOpacity="0.28"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <line
          x1="88.0"
          y1="192.0"
          x2="138.0"
          y2="192.0"
          stroke="#1A1A1A"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.22"
        />
        <line
          x1="90.0"
          y1="196.0"
          x2="132.0"
          y2="196.0"
          stroke="#1A1A1A"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.16"
        />
        <line
          x1="252.0"
          y1="192.0"
          x2="306.0"
          y2="192.0"
          stroke="#1A1A1A"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.12"
        />
        <line
          x1="256.0"
          y1="196.0"
          x2="300.0"
          y2="196.0"
          stroke="#1A1A1A"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.1"
        />
      </svg>
      <figcaption className="fh-caption px-6 py-4">
        A place for your family&apos;s real photos — warm light, real moments,
        never a stock image.
      </figcaption>
    </figure>
  );
}

function LandingPage() {
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [waitlistMessage, setWaitlistMessage] = useState("");

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setWaitlistStatus("submitting");
    setWaitlistMessage("");

    try {
      const result = await joinWaitlist({ data: { email: email.trim() } });
      if (result.success) {
        setWaitlistStatus("success");
        setWaitlistMessage(result.message);
        setEmail("");
      } else {
        setWaitlistStatus("error");
        setWaitlistMessage(result.message);
      }
    } catch {
      setWaitlistStatus("error");
      setWaitlistMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <PageTurn className="min-h-dvh">
      <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-2 pb-14 md:max-w-[680px] md:px-10">
        {/* ── Header — wordmark + sign in ─────────────────────────── */}
        <header className="flex items-center justify-between gap-4">
          <Logo variant="full" size="md" />
          <Link
            to="/sign-in"
            className="fh-body-sm fh-link"
            style={{ color: "var(--color-fh-muted)", textDecoration: "none" }}
          >
            Sign in
          </Link>
        </header>
        <HandDivider className="mt-3" dot />

        {/* ── Hero ────────────────────────────────────────────────── */}
        <section className="mt-10 flex flex-col items-center text-center md:mt-14">
          <Sprig />
          <h1 className="fh-hero mt-5 max-w-[9.5em]">
            Stay close to the people who{" "}
            <span style={{ color: "var(--color-fh-accent)" }}>matter</span>
          </h1>
          <SketchUnderline className="mt-3" color="var(--color-fh-highlight)" />
          <p className="fh-body mt-7 max-w-[34ch] text-left md:text-center">
            A private little home for your family&apos;s connection. No feeds,
            no likes — just gentle nudges to stay close, and the joy of real
            calls, letters and visits.
          </p>
        </section>

        {/* ── Warm album card ─────────────────────────────────────── */}
        <section className="mt-10">
          <AlbumIllustration />
        </section>

        {/* ── How it works ────────────────────────────────────────── */}
        <section className="mt-9">
          <div className="fh-card-soft">
            <h2 className="fh-h2">How it works</h2>
            <SketchUnderline className="mt-1.5" />
            <ul className="mt-6 flex flex-col gap-6">
              {HOW_IT_WORKS.map((step) => (
                <li key={step.title} className="flex items-start gap-4">
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: "var(--color-fh-surface-soft)",
                      border: "1px solid var(--color-fh-border)",
                    }}
                  >
                    <Icon name={step.icon} size={22} />
                  </span>
                  <div>
                    <h3 className="fh-h4">{step.title}</h3>
                    <p
                      className="fh-body-sm mt-1"
                      style={{ color: "var(--color-fh-muted)" }}
                    >
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Calls to action ─────────────────────────────────────── */}
        <section className="mt-9 flex flex-col items-stretch gap-3">
          <Link to="/sign-up" className="fh-btn fh-btn-primary w-full">
            Create your family home
          </Link>
          <Link to="/join" className="fh-btn fh-btn-secondary w-full">
            I have an invite
          </Link>
          <p className="fh-caption mt-1 text-center">
            Free for your whole family — no card needed.
          </p>
        </section>

        {/* ── The quiet promise ───────────────────────────────────── */}
        <section className="mt-10 px-2 text-center">
          <HandDivider className="mb-6" />
          <p className="fh-body-sm" style={{ color: "var(--color-fh-body)" }}>
            No feeds · No likes · No ads · No noise
          </p>
          <p className="fh-caption mx-auto mt-2 max-w-[30ch]">
            Metadata only — frequency, recency, initiation. We never read your
            messages. Never content.
          </p>
        </section>

        {/* ── Waitlist — kept from the previous page, in a quieter tone ── */}
        <section className="mt-10">
          <div className="fh-card">
            <h2 className="fh-h3">Not ready just yet?</h2>
            <p
              className="fh-body-sm mt-2"
              style={{ color: "var(--color-fh-muted)" }}
            >
              Leave your email and we&apos;ll write to you once — when Family
              Core is ready for your family.
            </p>
            {waitlistStatus === "success" ? (
              <div className="fh-note mt-4 flex items-start gap-3">
                <Icon name="check" size={22} />
                <p className="fh-body-sm">{waitlistMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="mt-4">
                <label
                  htmlFor="waitlist-email"
                  className="fh-label mb-1.5 block"
                >
                  Your email
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="waitlist-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="fh-input sm:flex-1"
                    required
                    disabled={waitlistStatus === "submitting"}
                  />
                  <button
                    type="submit"
                    disabled={waitlistStatus === "submitting"}
                    className="fh-btn fh-btn-sand"
                  >
                    {waitlistStatus === "submitting"
                      ? "Sending…"
                      : "Join the list"}
                  </button>
                </div>
                {waitlistStatus === "error" && (
                  <p
                    className="fh-body-sm mt-2"
                    style={{ color: "var(--color-fh-status-error)" }}
                  >
                    {waitlistMessage}
                  </p>
                )}
              </form>
            )}
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer className="mt-12">
          <HandDivider className="mb-6" dot />
          <nav className="flex items-center justify-center gap-5">
            <Link
              to="/privacy"
              className="fh-body-sm fh-link"
              style={{ textDecoration: "none" }}
            >
              Privacy
            </Link>
            <span aria-hidden="true" style={{ color: "var(--color-fh-line)" }}>
              ·
            </span>
            <Link
              to="/terms"
              className="fh-body-sm fh-link"
              style={{ textDecoration: "none" }}
            >
              Terms
            </Link>
          </nav>
          <p className="fh-caption mt-4 text-center">
            Family Core © {new Date().getFullYear()} — the app that puts your
            phone down.
          </p>
        </footer>
      </main>
    </PageTurn>
  );
}
