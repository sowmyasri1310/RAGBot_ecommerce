import * as fs from 'fs';
import * as path from 'path';

const DATASET_DIR = path.join(__dirname, '..', 'data', 'sample_dataset');

interface Doc {
  category: string;
  filename: string;
  content: string;
}

const documents: Doc[] = [
  // ==========================================
  // PRODUCT DESCRIPTIONS (Markdown / Text)
  // ==========================================
  {
    category: 'product_descriptions',
    filename: 'dell_xps_15_description.md',
    content: `# Product Name
Dell XPS 15 (9530) Powerhouse Laptop

# Category
Laptops

# Price
$1899

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The Dell XPS 15 is the ultimate tool for creators, professionals, and power users. Crafted with premium CNC machined aluminum and a carbon fiber composite palm rest, it combines breathtaking styling with top-tier durability.

# Key Features
* 4-sided InfinityEdge display with a 92.9% screen-to-body ratio
* Integrated Waves MaxxAudio Pro speakers
* Backlit keyboard and precision touchpad

# Technical Specifications
* Processor: Intel Core i9-13900H (14 Cores, up to 5.4 GHz)
* Memory: 32GB DDR5 Dual Channel RAM (Supports up to 64GB RAM)
* Storage: 1TB PCIe NVMe M.2 SSD
* Graphics: NVIDIA GeForce RTX 4070 (8GB GDDR6 VRAM)
* Display: 15.6-inch OLED 3.5K (3456 x 2160) InfinityEdge Touch Screen, 400 nits, 100% DCI-P3
* Battery: 86Whr Integrated Battery supporting ExpressCharge fast charging (80% in 60 minutes)
* Ports: 2x Thunderbolt 4 (USB Type-C), 1x USB-C 3.2 Gen 2, SD Card Reader, 3.5mm Headphone Jack
* Weight: 1.92 kg (4.23 lbs)

# Recommended For
* Video Editing
* 3D Rendering
* Software Development
* Multitasking

# Accessories Included
* 130W USB-C AC Adapter
* USB-C to USB-A/HDMI Dongle
* Quick Start Guide

# FAQs
* Q: Can I upgrade the RAM?
* A: Yes, it features two SO-DIMM slots and supports up to 64GB DDR5 RAM.
`
  },
  {
    category: 'product_descriptions',
    filename: 'hp_spectre_x360_description.md',
    content: `# Product Name
HP Spectre x360 14 Convertible Laptop

# Category
Laptops

# Price
$1599

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
Experience the power of versatility with the HP Spectre x360. This 2-in-1 convertible laptop features a gem-cut design, precision-engineered hinge, and stunning display that adapts to your work, creations, and entertainment.

# Key Features
* 2-in-1 convertible design with Laptop, Tent, Reverse, and Tablet modes
* 9MP IR camera with AI-driven auto-framing and background blur
* Gem-cut aluminum design and haptic touchpad

# Technical Specifications
* Processor: Intel Core Ultra 7 155H (16 Cores, up to 4.8 GHz with Intel AI Boost)
* Memory: 16GB LPDDR5x onboard RAM (No upgrades available)
* Storage: 2TB PCIe Gen4 NVMe M.2 SSD
* Graphics: Intel Arc Graphics
* Display: 14-inch 2.8K (2880 x 1800) OLED Touchscreen, 120Hz refresh rate, HDR 500 nits
* Battery: 68Whr battery with HP Fast Charge (50% in 45 minutes)
* Keyboard: Full-size backlit keyboard, haptic touchpad
* Stylus: HP Rechargeable MPP 2.0 Tilt Pen included
* Ports: 2x Thunderbolt 4, 1x USB Type-A, Headphone/Microphone combo

# Recommended For
* Creative Professionals
* Students
* Digital Illustrators
* Business Executives

# Accessories Included
* HP Rechargeable MPP 2.0 Tilt Pen
* 65W USB-C Power Adapter
* Protective Sleeve

# FAQs
* Q: Is the RAM upgradable?
* A: No, the RAM is soldered onboard and cannot be upgraded after purchase.
`
  },
  {
    category: 'product_descriptions',
    filename: 'lenovo_thinkpad_x1_carbon.txt',
    content: `# Product Name
Lenovo ThinkPad X1 Carbon Gen 11 Business Laptop

# Category
Laptops

# Price
$1899

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The Lenovo ThinkPad X1 Carbon Gen 11 is the gold standard for enterprise laptops, offering legendary durability, outstanding performance, and premium security features in an ultra-light carbon-fiber chassis.

# Key Features
* Spill-resistant keyboard with the iconic red TrackPoint
* Military-grade requirements tested (MIL-STD 810H)
* High-security TPM 2.0 and Match-on-Chip Fingerprint Reader

# Technical Specifications
* Processor: Intel Core i7-1365U vPro (10 Cores, up to 5.2 GHz)
* Memory: 32GB LPDDR5 RAM (Soldered)
* Storage: 1TB PCIe NVMe Gen 4 SSD
* Graphics: Intel Iris Xe Graphics
* Display: 14.0" WUXGA (1920 x 1200) IPS, Anti-Glare, Low Blue Light, 400 nits
* Battery: 57Whr battery supporting Rapid Charge (80% charge in 60 minutes using 65W charger)
* Weight: 1.12 kg (2.48 lbs)
* Operating System: Windows 11 Pro
* Security: Discrete TPM 2.0, Match-on-Chip Fingerprint Reader, IR Camera with Privacy Shutter

# Recommended For
* Corporate Professionals
* Frequent Travelers
* Security-Focused Industries

# Accessories Included
* 65W USB-C Rapid Charger
* User Manual

# FAQs
* Q: What is the TrackPoint?
* A: It is the iconic red pointing stick in the center of the keyboard used for cursor navigation.
`
  },
  {
    category: 'product_descriptions',
    filename: 'apple_macbook_pro_16_description.md',
    content: `# Product Name
Apple MacBook Pro 16-Inch (M3 Max)

# Category
Laptops

# Price
$2499

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
Designed for users who demand extreme performance, the MacBook Pro 16-inch with M3 Max is a powerhouse laptop featuring Apple's cutting-edge 3-nanometer chip technology.

# Key Features
* Apple M3 Max 3-nanometer chip technology
* Liquid Retina XDR display with 1600 nits peak brightness and ProMotion 120Hz
* Six-speaker sound system with force-cancelling woofers supporting Spatial Audio

# Technical Specifications
* Processor: Apple M3 Max Chip (16-Core CPU, 12 Performance and 4 Efficiency Cores)
* Memory: 48GB Unified Memory (Configurable up to 128GB)
* Storage: 1TB Superfast SSD (Up to 8TB)
* Graphics: 40-Core GPU with Hardware-Accelerated Ray Tracing
* Display: 16.2-inch Liquid Retina XDR (3024 x 1964), 1600 nits Peak HDR, ProMotion 120Hz
* Battery: 100Whr lithium-polymer battery supporting 140W Fast Charging (50% in 30 minutes)
* Battery Life: Up to 22 hours of Apple TV app movie playback
* Ports: 3x Thunderbolt 4 (USB-C), HDMI port, SDXC card slot, MagSafe 3 port, Headphone jack
* Weight: 2.16 kg (4.8 lbs)

# Recommended For
* Machine Learning Developers
* Cinematic Video Editors
* Audio Producers
* Professional Colorists

# Accessories Included
* 140W USB-C Power Adapter
* USB-C to MagSafe 3 Cable (2m)

# FAQs
* Q: Can I upgrade the unified memory later?
* A: No, the unified memory is integrated into the Apple Silicon chip and cannot be upgraded after purchase.
`
  },
  {
    category: 'product_descriptions',
    filename: 'asus_rog_zephyrus_g16.md',
    content: `# Product Name
ASUS ROG Zephyrus G16 (2024) Gaming Laptop

# Category
Laptops

# Price
$2199

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The ASUS ROG Zephyrus G16 redefines gaming laptops by packing ultra-high-end specifications into a sleek, 1.49cm thin premium aluminum chassis. It bridges the gap between pure gaming performance and daily lifestyle usability.

# Key Features
* ROG Nebula OLED Display (2.5K, 240Hz, G-Sync support)
* Thin 1.49cm premium aluminum chassis
* Customized slash lighting on the lid for personalization

# Technical Specifications
* Processor: Intel Core Ultra 9 185H (16 Cores, up to 5.1 GHz with AI Engine)
* Memory: 32GB LPDDR5X Dual Channel RAM
* Storage: 2TB PCIe 4.0 NVMe M.2 SSD
* Graphics: NVIDIA GeForce RTX 4080 (12GB GDDR6 VRAM, Max TGP 115W with Dynamic Boost)
* Display: 16-inch ROG Nebula Display, OLED 2.5K (2560 x 1600), 240Hz, 0.2ms, G-Sync, 500 nits
* Battery: 90Whr High-capacity battery supporting 100W USB-C Power Delivery and fast charging (50% in 30 minutes)
* Cooling: ROG Intelligent Cooling with liquid metal thermal compound and tri-fan technology
* Weight: 1.85 kg (4.08 lbs)

# Recommended For
* Elite Gaming
* Virtual Reality
* Game Development
* Heavy Compute Workloads

# Accessories Included
* 240W AC Power Adapter
* 100W USB-C Power Delivery Charger
* ROG Sleeve

# FAQs
* Q: What is ROG Nebula OLED?
* A: It is a high-performance OLED panel with perfect black levels, rapid response times, and high refresh rate.
`
  },
  {
    category: 'product_descriptions',
    filename: 'acer_predator_helios_16.txt',
    content: `# Product Name
Acer Predator Helios 16 High-Performance Gaming Laptop

# Category
Laptops

# Price
$1649

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The Acer Predator Helios 16 is a high-octane gaming rig built for competitive gamers who refuse to compromise on speed, thermals, or visual fidelity.

# Key Features
* 4-Zone RGB Backlit Keyboard with WASD key caps
* Physical MUX switch to bypass integrated GPU for max gaming performance
* 5th Gen AeroBlade 3D Fan technology and Vector Heat Pipes

# Technical Specifications
* Processor: Intel Core i9-13900HX (24 Cores, 32 Threads, up to 5.4 GHz)
* Memory: 16GB DDR5 5600MHz RAM (User-upgradable to 32GB)
* Storage: 1TB PCIe Gen 4 NVMe SSD
* Graphics: NVIDIA GeForce RTX 4070 (8GB GDDR6, Max TGP 140W)
* Display: 16.0" WQXGA (2560 x 1600) IPS, 240Hz Refresh Rate, 500 nits, 100% sRGB, NVIDIA G-SYNC
* Battery: 90Whr Li-ion Battery with 330W AC adapter
* Cooling: 5th Gen AeroBlade 3D Fan technology, Vector Heat Pipes, Liquid Metal cooling

# Recommended For
* Competitive AAA Gaming
* Esports Play
* Game Streaming

# Accessories Included
* 330W AC Adapter
* Quick Setup Guide

# FAQs
* Q: Can I upgrade the RAM?
* A: Yes, it is user-upgradable up to 32GB.
`
  },
  {
    category: 'product_descriptions',
    filename: 'samsung_odyssey_neo_g9.md',
    content: `# Product Name
Samsung Odyssey Neo G9 57" Curved Gaming Monitor

# Category
Monitors

# Price
$1799

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The Samsung Odyssey Neo G9 (G95NC) is the world's first Dual UHD curved gaming monitor, providing an unprecedented 57-inch workspace and curved visual field.

# Key Features
* World's first Dual UHD curved monitor (7680 x 2160)
* 1000R curvature matching the human eye
* Quantum Mini LED backlighting with 2,392 dimming zones

# Technical Specifications
* Screen Size: 57 inches (Aspect Ratio 32:9)
* Curvature: 1000R Curved screen
* Resolution: Dual UHD (7680 x 2160)
* Panel Type: VA with Quantum Mini LED backlighting (2,392 dimming zones)
* Refresh Rate: 240Hz
* Response Time: 1ms (GtG)
* Brightness: 420 nits typical, 1000 nits peak (VESA DisplayHDR 1000)
* Ports: 1x DisplayPort 2.1, 3x HDMI 2.1, USB Hub
* Features: AMD FreeSync Premium Pro, CoreSync RGB lighting, Picture-in-Picture / Picture-by-Picture

# Recommended For
* Flight Simulators
* Racing Games
* Video Editing Timelines
* Massive Multi-window Productivity

# Accessories Included
* DisplayPort 2.1 Cable
* HDMI 2.1 Cable
* VESA Mount Adapter Bracket (100mm x 100mm)

# FAQs
* Q: How much does it weigh?
* A: The monitor weighs 19 kg without the stand and requires two adults to assemble.
`
  },
  {
    category: 'product_descriptions',
    filename: 'sony_wh1000xm5_headphones.txt',
    content: `# Product Name
Sony WH-1000XM5 Wireless Noise Cancelling Headphones

# Category
Audio

# Price
$399

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The Sony WH-1000XM5 wireless headphones rewrite the rules for distraction-free listening. With two processors controlling eight microphones, it delivers industry-leading active noise cancellation (ANC) and call quality.

# Key Features
* Industry-leading Active Noise Cancellation (ANC) with Auto NC Optimizer
* Speak-to-Chat pauses music when you speak automatically
* Multipoint connection to pair and use 2 Bluetooth devices simultaneously

# Technical Specifications
* Driver Unit: 30mm custom dome drivers
* Noise Cancelling: Auto NC Optimizer adjusted based on atmospheric pressure
* Bluetooth Version: 5.2 (LDAC, AAC, SBC codecs)
* Battery Life: Up to 30 hours with ANC ON, Up to 40 hours with ANC OFF
* Charging: USB Power Delivery fast charging (3 mins charge gives up to 5 hours playback)
* Microphones: 4 microphones on each side for premium voice pickup and noise rejection
* Weight: 250 grams
* Smart Features: Speak-to-Chat, Quick Attention mode, Multipoint Connection

# Recommended For
* Office Meetings
* Frequent Travelers
* Daily Commuters
* Audiophiles

# Accessories Included
* Premium Carrying Case
* 1.2m Headphone Connection Cable
* USB-C Charging Cable

# FAQs
* Q: Does it support high-res audio?
* A: Yes, it supports Sony's high-res LDAC Bluetooth audio format.
`
  },
  {
    category: 'product_descriptions',
    filename: 'logitech_mx_keys_s.md',
    content: `# Product Name
Logitech MX Keys S Wireless Keyboard

# Category
Accessories

# Price
$109

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The Logitech MX Keys S is a premium low-profile wireless keyboard designed for typing precision, speed, and comfort. It features smart illumination, fluid tactile typing, and customizable smart actions.

# Key Features
* Spherical-dished keys matching fingertips for fluid typing
* Smart proximity backlighting that auto-adjusts to ambient light
* Easy-Switch button to connect and switch between up to 3 devices

# Technical Specifications
* Keys: Spherical-dished keys matching fingertips, low-profile design
* Connectivity: Bluetooth Low Energy or Logi Bolt USB Receiver
* Multi-Device: Easy-Switch button for up to 3 devices
* Battery: USB-C Rechargeable (Up to 10 days on a full charge or 5 months off)
* Dimensions: 131.6 x 430.2 x 20.5 mm
* Weight: 810 grams
* Software: Logi Options+ app (supports custom macros and Smart Actions)

# Recommended For
* Software Developers
* Professional Writers
* Graphic Designers
* Office Productivity

# Accessories Included
* Logi Bolt USB Receiver
* USB-C Charging Cable (USB-A to USB-C)

# FAQs
* Q: Is it back-lit?
* A: Yes, it features smart proximity white backlighting.
`
  },
  {
    category: 'product_descriptions',
    filename: 'apple_watch_ultra_2.txt',
    content: `# Product Name
Apple Watch Ultra 2 GPS + Cellular

# Category
Smartwatches

# Price
$799

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The Apple Watch Ultra 2 is the ultimate rugged and capable sport smartwatch, engineered for athletes, outdoor adventurers, and deep-sea divers.

# Key Features
* 49mm aerospace-grade titanium case with raised edges to protect sapphire front crystal
* Always-On Retina LTPO OLED display with up to 3000 nits brightness
* Double Tap gesture for hands-free operations

# Technical Specifications
* Case Size: 49mm aerospace-grade titanium case
* Chip: S9 SiP with 4-Core Neural Engine
* GPS: Precision dual-frequency GPS (L1 and L5)
* Water Resistance: 100 meters, recreational dive certified to 40 meters
* Battery Life: Up to 36 hours of normal use, up to 72 hours in Low Power Mode
* Sensors: Depth gauge, water temperature sensor, blood oxygen sensor, ECG, heart rate

# Recommended For
* Outdoor Adventurers
* Extreme Sports Athletes
* Deep-sea Divers
* Endurance Runners

# Accessories Included
* Apple Watch Magnetic Fast Charger to USB-C Cable (1m)
* Specially picked Alpine Loop, Trail Loop, or Ocean Band

# FAQs
* Q: Does it have a siren?
* A: Yes, it features an 86-decibel siren audible up to 180 meters.
`
  },
  {
    category: 'product_descriptions',
    filename: 'bose_quietcomfort_ultra_earbuds.md',
    content: `# Product Name
Bose QuietComfort Ultra Earbuds

# Category
Audio

# Price
$299

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The Bose QuietComfort Ultra Earbuds provide a benchmark listening experience with world-class noise cancellation, breakthrough spatialized audio, and CustomTune personalized sound technology.

# Key Features
* World-class Active Noise Cancellation with CustomTune sound calibration
* Breakthrough Bose Immersive Audio spatial sound stage
* IPX4 sweat and weather-resistant rating

# Technical Specifications
* Noise Cancellation: World-class CustomTune ANC (Quiet, Aware, and Immersion modes)
* Audio Technology: Bose Immersive Audio
* Microphones: 4 microphones per earbud for clear voice filters
* Battery Life: Up to 6 hours per charge (4 hours with Immersive Audio on); Case provides 3 additional charges
* Charging: USB-C charging, supports wireless Qi charging cases (sold separately)
* Water Resistance: IPX4 sweat and weather-resistant rating
* Controls: Custom touch sensors on earbuds for volume, skip, ANC, and calls

# Recommended For
* Workout Sessions
* Noisy Commutes
* Daily Phone Calls
* High-fidelity Listening

# Accessories Included
* Bose Fit Kit (3 sizes of ear tips and stability bands)
* Carrying Charging Case
* USB-C Charging Cable

# FAQs
* Q: What is Bose Immersive Audio?
* A: It is a spatial audio feature that creates an open, lifelike sound stage.
`
  },
  {
    category: 'product_descriptions',
    filename: 'keychron_q1_pro_keyboard.txt',
    content: `# Product Name
Keychron Q1 Pro Mechanical Keyboard

# Category
Accessories

# Price
$199

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The Keychron Q1 Pro is a premium QMK/VIA wireless custom mechanical keyboard, boasting a full CNC aluminum body and double-gasket acoustic mounting.

# Key Features
* Premium full CNC machined aluminum body
* Double-gasket acoustic mounting design for flex and soft sound
* Hot-swappable sockets compatible with 3-pin and 5-pin mechanical switches

# Technical Specifications
* Layout: 75% Layout (82 keys) with programmable aluminum rotary encoder knob
* Body: Premium CNC Machined Aluminum Case
* Connectivity: Bluetooth 5.1 or wired USB-C mode
* Switch Support: Hot-swappable compatible with 3-pin and 5-pin mechanical switches
* Keycaps: Double-shot KSA profile PBT keycaps
* Backlighting: South-facing RGB LEDs with 22 preset settings
* Key Mapping: Fully customizable using VIA or QMK web launcher
* Battery: 4000mAh rechargeable lithium battery (up to 300 hours with RGB off)

# Recommended For
* Keyboard Enthusiasts
* Software Developers
* Creative Writers
* Typists

# Accessories Included
* USB-C to USB-C Cable
* USB-A to USB-C Adapter
* Keycap Puller
* Switch Puller
* Custom Screwdriver

# FAQs
* Q: Is it compatible with Mac?
* A: Yes, it features a physical toggle switch to swap between Mac/iOS and Windows/Android layouts.
`
  },
  {
    category: 'product_descriptions',
    filename: 'razer_deathadder_v3_pro.md',
    content: `# Product Name
Razer DeathAdder V3 Pro

# Category
Accessories

# Price
$149

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The Razer DeathAdder V3 Pro is a lightweight ergonomic wireless gaming mouse engineered in collaboration with esports professionals to deliver extreme speed and pixel-perfect accuracy.

# Key Features
* Ultra-lightweight 63-gram ergonomic design
* Optical Mouse Switches Gen-3 rated for 90 million clicks (no double-clicking bugs)
* Focus Pro 30K Optical Sensor with asymmetric cut-off lift-off controls

# Technical Specifications
* Weight: 63 grams ultra-lightweight design
* Sensor: Focus Pro 30K Optical Sensor (99.8% resolution accuracy)
* Max Sensitivity: 30,000 DPI
* Max Speed: 750 IPS at 70G acceleration
* Polling Rate: Up to 8000Hz (with HyperPolling Wireless Dongle, sold separately)
* Switches: Optical Mouse Switches Gen-3 rated for 90 million clicks
* Battery Life: Up to 90 hours on a full charge (USB-C rechargeable)
* Connectivity: Razer HyperSpeed Wireless or wired USB-C

# Recommended For
* FPS Gamers
* Competitive Esports Professionals
* Ergonomic Mouse Enthusiasts

# Accessories Included
* Razer HyperSpeed Wireless Dongle + USB Dongle Adapter
* USB-A to USB-C Speedflex Cable
* Razer Mouse Grip Tape

# FAQs
* Q: Why optical switches?
* A: Optical switches use light beams instead of physical copper contacts, preventing wear-out and double-clicking bugs.
`
  },
  {
    category: 'product_descriptions',
    filename: 'anker_prime_20k_powerbank.txt',
    content: `# Product Name
Anker Prime 20K Power Bank

# Category
Portable Charging

# Price
$129

# Warranty
Warranty Period: 18 Months
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The Anker Prime 200W Power Bank combines ultra-high capacity with blazing-fast charging outputs to keep your high-performance laptops and phones charged anywhere.

# Key Features
* High capacity 20,000mAh battery charging a MacBook Pro 16 to 50% in under 40 minutes
* Blazing fast 200W maximum output across multiple ports
* Digital LCD color display showing real-time wattages and battery health

# Technical Specifications
* Battery Capacity: 20,000mAh
* Total Maximum Output: 200W across multiple ports
* Port Configuration: 2x USB-C (100W Max per port), 1x USB-A (65W Max)
* Recharging Speed: Supports up to 100W USB-C fast recharging (recharges to 100% in 75 minutes)
* Smart Display: Digital LCD color screen showing real-time power inputs, outputs, and health
* Dimensions: 126.8 x 54.6 x 49.6 mm
* Weight: 540 grams

# Recommended For
* Travel
* Remote Work
* Mobile Professionals

# Accessories Included
* 2ft 140W USB-C to USB-C Cable
* Travel Pouch
* Welcome Guide

# FAQs
* Q: Can I bring it on a flight?
* A: Yes, it is rated at 72Whr, which is below the FAA 100Whr limit for carry-on luggage.
`
  },
  {
    category: 'product_descriptions',
    filename: 'dji_osmo_pocket_3.md',
    content: `# Product Name
DJI Osmo Pocket 3 Gimbal Camera

# Category
Camera

# Price
$519

# Warranty
Warranty Period: 2 Years
Coverage: Manufacturing defects
Support: Premium Support

# Overview
The DJI Osmo Pocket 3 features a powerful 1-inch CMOS sensor, putting detailed, high-resolution imaging right in the palm of your hand. With a rotatable touchscreen and 3-axis mechanical stabilization, it is the ultimate run-and-gun filmmaking companion.

# Key Features
* Powerful 1-inch CMOS sensor for high-resolution 4K/120fps recording
* 3-axis mechanical gimbal stabilization for completely shake-free cinematic videos
* 2.0-inch Rotatable OLED Touchscreen for vertical or horizontal shooting modes

# Technical Specifications
* Sensor: 1-inch CMOS Sensor
* Resolution: 4K UHD video at up to 120fps
* Color Profiles: 10-bit D-Log M and 10-bit HLG for professional color grading
* Stabilization: 3-Axis mechanical gimbal stabilization
* Screen: 2.0-inch Rotatable OLED Touchscreen
* Focusing: Full-pixel fast focusing with Product Showcase mode
* Tracking: ActiveTrack 6.0 with Auto-Face tracking
* Battery: Built-in 1300mAh battery supporting fast charge (80% in 16 minutes)

# Recommended For
* Vloggers
* Content Creators
* Travel Filmmakers
* Retail Reviewers

# Accessories Included
* Wrist Strap
* Protective Cover
* Type-C to Type-C PD Cable

# FAQs
* Q: How do you turn it on?
* A: Simply rotate the touchscreen 90 degrees clockwise to boot the gimbal instantly.
`
  },
  
  // ==========================================
  // USER MANUALS (Markdown / Text)
  // ==========================================
  {
    category: 'manuals',
    filename: 'dell_xps_15_manual.md',
    content: `# User Manual & Diagnostic Guide: Dell XPS 15

This guide provides operational and troubleshooting instructions for the Dell XPS 15 laptop series.

## Setup Instructions
1. **Powering On**: Connect the provided 130W USB-C AC adapter to any of the USB-C / Thunderbolt 4 ports on either side. Press the power button located in the top-right corner of the keyboard.
2. **Fingerprint Setup**: The power button contains a fingerprint reader. Register your fingerprint in Windows Hello Settings.
3. **Optimizing Display**: Open Intel Graphics Command Center or Dell PremierColor to adjust the OLED color space (sRGB, Adobe RGB, or DCI-P3).

## Battery & Fast Charging
The laptop supports ExpressCharge. To enable fast charging:
- Shut down the computer or set it to sleep mode.
- Use ONLY the original Dell 130W adapter. Using lower wattage adapters will disable fast charging and result in slow charging warnings.
- The battery will charge from 0% to 80% in approximately 60 minutes.

## LED Diagnostic Codes
If the laptop does not boot, check the front battery status light. It will flash red and white diagnostic codes:
- **2 Amber, 1 White**: Processor (CPU) failure. Contact support.
- **2 Amber, 3 White**: System board or BIOS corruption.
- **3 Amber, 3 White**: No memory (RAM) detected. Try re-seating the memory sticks.
- **3 Amber, 4 White**: Graphics card (GPU) error.
`
  },
  {
    category: 'manuals',
    filename: 'hp_spectre_x360_manual.txt',
    content: `User Manual: HP Spectre x360 14 Convertible Laptop

Setup and Mode Adjustments:
1. Four Screen Modes:
   - Laptop Mode: Open the lid up to 135 degrees. Use for standard desktop work.
   - Tent Mode: Rotate the screen 315 degrees and place the device on a flat surface like an inverted 'V'. Great for presentations.
   - Reverse Mode: Rotate the screen 270 degrees and place the keyboard face-down. Recommended for video playback.
   - Tablet Mode: Rotate the screen 360 degrees flat against the keyboard. The keyboard and trackpad are automatically disabled to prevent accidental clicks.

Haptic Touchpad Customizations:
- Go to Windows Settings > Bluetooth & Devices > Touchpad.
- Toggle haptic feedback strength or customize multi-finger gestures.

Stylus Charging & Connection:
- The HP MPP 2.0 Tilt Pen is rechargeable. Slide open the top of the stylus to reveal the USB-C port.
- Attach the stylus magnetically to the right side of the laptop when not in use.

Overheating Solutions:
- If the cooling fan is loud or the laptop gets hot, open the 'HP Command Center' app.
- Under Thermal Profiles, select 'Smart Sense' or 'Cool' to throttle CPU performance and boost fan operations.
`
  },
  {
    category: 'manuals',
    filename: 'lenovo_thinkpad_x1_manual.md',
    content: `# Maintenance and Operating Manual: ThinkPad X1 Carbon

Operating procedures and enterprise configurations.

## TrackPoint Customization
The red TrackPoint pointing stick is located in the center of the keyboard. If the pointer drifts:
1. Leave the mouse untouched for 5 seconds; it will auto-calibrate.
2. Adjust TrackPoint sensitivity in 'Lenovo Commercial Vantage' > Input settings.

## BIOS Enterprise Security
To enter the BIOS:
1. Power off the system completely.
2. Turn on and immediately tap the F1 key repeatedly until the BIOS utility appears.
3. To reset the supervisor password, enter current supervisor password, navigate to Security > Password, and select Reset. Note: If the supervisor password is forgotten, the system board must be replaced at user expense.

## Spill-Resistant Keyboard Maintenance
The keyboard features a drainage channel. If liquid is spilled:
- Do not shake the computer.
- Unplug the power adapter immediately.
- Shut down the system by holding the power button for 10 seconds.
- Let the computer sit on a flat surface. The liquid will drain out of the dedicated drainage holes located under the laptop chassis.
`
  },
  {
    category: 'manuals',
    filename: 'sony_wh1000xm5_manual.txt',
    content: `Operation Manual: Sony WH-1000XM5 Headphones

Touch Sensor Operations (Right Ear Cup):
- Play / Pause: Tap twice quickly.
- Next Track: Swipe forward (toward the front).
- Previous Track: Swipe backward (toward the rear).
- Increase Volume: Swipe upward repeatedly.
- Decrease Volume: Swipe downward repeatedly.
- Activate Voice Assistant: Press and hold the center of the panel.

Speak-to-Chat Activation:
- Place two fingers on the touch sensor panel and hold for 2 seconds. You will hear voice guidance say "Speak-to-chat activated".
- Speak-to-chat automatically pauses your music when you speak to someone, and resumes music 15 seconds after you stop speaking.

Multipoint Pairing (Connecting two devices):
1. Open the 'Sony Headphones Connect' app.
2. Turn on "Connect to 2 devices simultaneously".
3. Pair the second device in the app's device manager.
Note: While using multipoint, high-resolution LDAC codec is not available.
`
  },
  {
    category: 'manuals',
    filename: 'samsung_odyssey_neo_g9_manual.md',
    content: `# Setup & Configuration Manual: Samsung Odyssey Neo G9

Optimal configuration settings for the Dual UHD monitor.

## Stand Assembly and VESA Mounting
- The Neo G9 weighs 19 kg without the stand. Assembly requires a minimum of two adults.
- To wall-mount, use the provided VESA bracket adapter (100mm x 100mm) and ensure the wall-mount arm is rated for at least 25 kg.

## Port Configurations and DisplayPort 2.1
To achieve 7680 x 2160 resolution at 240Hz:
1. Connect using the provided DisplayPort 2.1 cable.
2. Ensure your graphics card supports DisplayPort 2.1 (e.g. AMD Radeon RX 7900 series or newer).
3. NVIDIA RTX 40-series cards support DisplayPort 1.4a and will cap out at 7680 x 2160 at 120Hz.

## Picture-by-Picture (PBP) Configuration
1. Press the Jog button under the monitor to open the Menu.
2. Navigate to System > PBP Mode and turn it ON.
3. Select the input source for the left and right halves (e.g. HDMI 1 and DisplayPort).
`
  },
  {
    category: 'manuals',
    filename: 'bose_qc_ultra_manual.txt',
    content: `User Manual & Safety Guide: Bose QuietComfort Ultra Earbuds

How to get a perfect acoustic seal:
1. Place the earbuds in your ear and rotate backward slightly.
2. Ensure the soft umbrella tip sits comfortably at the entrance of your ear canal.
3. Use the 'Bose Music App' and run the 'Ear Tip Fit Test' to verify sealing. A poor seal will degrade bass and noise cancellation performance.

Touch Sensor Controls (Both Earbuds):
- Media Playback: Tap once.
- Call Control: Tap once to answer/end calls. Double tap to decline.
- Volume: Swipe UP on the touch strip of either earbud to increase volume; swipe DOWN to decrease.
- Cycle ANC Modes: Press and hold the touch strip. Cycles between Quiet (ANC On), Aware (Pass-through), and Immersion (Spatial Audio + ANC).

Factory Reset Instructions:
1. Place both earbuds into the charging case and leave the case open.
2. Press and hold the button on the back of the case for 25 seconds until the light on the front flashes blue/amber.
3. Delete the earbuds from the Bluetooth list on your phone and pair again.
`
  },
  {
    category: 'manuals',
    filename: 'keychron_q1_pro_manual.md',
    content: `# Keychron Q1 Pro User Manual

Customizing keys, switches, and layouts.

## Switching Operating System Modes
There is a toggle switch on the back panel labeled:
- **Win/Android**: Use this layout when connecting to Windows or Android devices.
- **Mac/iOS**: Use this layout when connecting to macOS, iPadOS, or iOS. The Option and Command keys will map automatically.

## Customizing VIA Remap Tools
1. Connect the keyboard using the USB-C cable.
2. Open a Chromium-based browser and go to \`usevia.app\`.
3. Click "Authorize device" and select Keychron Q1 Pro.
4. Drag and drop any key function to remap. You can program up to 4 custom layout layers.
5. Knob customization: The top-right knob is mapped to Volume Up/Down (turn) and Mute (click) by default. Use Layer 0 and Layer 1 to change knob rotations to zooming, scroll, or backlight adjustments.
`
  },
  {
    category: 'manuals',
    filename: 'dji_osmo_pocket_3_manual.txt',
    content: `User Manual & Quickstart: DJI Osmo Pocket 3

Operating Instructions:
1. Turn On: Rotate the touchscreen 90 degrees clockwise. The gimbal will self-calibrate and center automatically.
2. Turn Off: Rotate the screen back to its vertical position. The gimbal will automatically lock in protective storage mode after 5 seconds.
3. Connection: Connect to the 'DJI Mimo' app via Wi-Fi for remote controls, live views, and firmware updates.

Product Showcase Mode:
- Access swipe-up settings. Toggle 'Product Showcase' ON.
- The camera will automatically prioritize focusing on objects held close in front of the lens instead of staying locked on the presenter's face. Highly recommended for retail video reviews.

Tracking Settings:
- Double-tap a subject on the screen to initiate ActiveTrack 6.0.
- Single-tap the screen to clear tracking.
`
  },
  {
    category: 'manuals',
    filename: 'anker_prime_powerbank_manual.md',
    content: `# Safety & Operations Manual: Anker Prime 200W Power Bank

Operating instructions and status readings.

## Smart LCD Display Guide
The front screen shows:
- **Input / Output Wattage**: Shows real-time draw in watts.
- **Remaining Time**: Time left in hours/minutes until the power bank is empty or fully recharged.
- **Battery Health**: Displayed as a percentage. If battery health drops below 75%, contact Anker for recycling and replacement advice.
- **Battery Temperature**: Displayed in Celsius/Fahrenheit.

## Over-Temperature Protection
If the internal battery temperature exceeds 55°C (131°F), the power bank will activate a protection mode:
- Output power will automatically drop to 10W per port.
- Screen will display a "High Temp Alert" warning triangle.
- Move the power bank to a cooler environment. Charging will resume at normal speeds once the temperature drops below 40°C.
`
  },
  {
    category: 'manuals',
    filename: 'razer_deathadder_v3_manual.txt',
    content: `User Guide: Razer DeathAdder V3 Pro Wireless Mouse

DPI Profile Switching:
- Turn the mouse upside down.
- Press the Power/DPI button once to cycle through the onboard DPI presets:
  - Red: 400 DPI
  - Green: 800 DPI (Default)
  - Blue: 1600 DPI
  - Cyan: 3200 DPI
  - Yellow: 6400 DPI
- To customize DPI values exactly, install 'Razer Synapse' on Windows.

Calibrating Asymmetric Cut-off:
- Open Razer Synapse. Select the mouse and go to Calibration settings.
- Adjust the lift-off distance (LOD) and landing distance independently. This prevents cursor drift when lifting the mouse off the mousepad during intensive gaming sessions.
`
  },

  // ==========================================
  // FAQ DOCUMENTS (Markdown / Text / CSV)
  // ==========================================
  {
    category: 'faqs',
    filename: 'laptop_power_faqs.md',
    content: `# FAQ: E-commerce Laptop Charging and Power Queries

### Q: Why is my laptop charging slowly or saying 'Slow Charger' connected?
**A**: Ensure you are using the original high-wattage AC adapter included with your laptop. For example, the Dell XPS 15 requires a 130W charger. If you connect a standard 65W phone charger, the system will charge at a crawl and display warnings because the power input cannot match the power consumption.

### Q: Can I charge my high-end laptop with a power bank?
**A**: Yes, but only if the power bank supports Power Delivery (PD) over USB-C and supplies a high enough wattage (typically 65W or higher). A power bank like the Anker Prime 20,000mAh supports up to 100W output per port and is perfect for charging MacBooks, Dell XPS, or Lenovo laptops.

### Q: Does fast charging damage my laptop battery life?
**A**: Modern laptops use sophisticated AI charging controllers (like ExpressCharge or Rapid Charge) that fast charge only up to 80% to protect battery chemistry. The charging slows down significantly from 80% to 100% to prevent excess heat, which is the primary cause of battery degradation.
`
  },
  {
    category: 'faqs',
    filename: 'monitor_compatibility_faqs.txt',
    content: `FAQ: Curved Gaming Monitor Setup and Compatibility

Q: My monitor screen is black when using DisplayPort. How do I fix this?
A: 1. Ensure the DisplayPort cable is fully pushed into both the monitor and your GPU (not the motherboard port).
2. Check that the monitor input source is set to DisplayPort in the settings menu.
3. If using a high-end monitor like the Samsung Odyssey Neo G9, make sure the cable is rated for DisplayPort 2.0/2.1 or DisplayPort 1.4. Cheap cables will fail to carry the required bandwidth.

Q: Can I connect my Apple MacBook Pro to the 57" Dual UHD Odyssey Neo G9 monitor?
A: Yes, you can. However, MacBook models with base Apple M-series chips (like base M1, M2, M3) only support one external monitor up to 6K at 60Hz. To run the Neo G9 at its full 7680 x 2160 resolution, you will need a MacBook Pro with an M-series Pro or Max chip and connect via an active Thunderbolt-to-DisplayPort cable or HDMI 2.1.

Q: What is a MUX switch in gaming laptops?
A: A MUX (Multiplexer) switch is a hardware switch that lets users manually connect the dedicated graphics card (like NVIDIA RTX) directly to the laptop screen, bypassing the integrated CPU graphics. This increases gaming performance and frame rates by 5% to 15% but reduces battery life.
`
  },
  {
    category: 'faqs',
    filename: 'audio_accessory_faqs.md',
    content: `# FAQ: Audio Products and Accessories

### Q: Why is active noise cancellation (ANC) poor on my earbuds?
**A**: The performance of ANC depends heavily on the physical fit and seal of the earbud in your ear canal. If the silicone ear tips are too small, external noise will leak in, neutralizing the anti-noise signals. Run the 'Ear Tip Fit Test' inside the Bose Music app or Sony Headphones Connect app to check your seal.

### Q: How do I switch bluetooth audio devices quickly on headphones?
**A**: If your headphones support "Multipoint Connection" (like the Sony WH-1000XM5 or Bose QC Ultra), you can pair them with two devices at once (e.g., your laptop and phone). Audio will automatically pause on your laptop and switch to your phone when you receive an incoming call.

### Q: What is LDAC Bluetooth audio format?
**A**: LDAC is a proprietary audio coding technology developed by Sony that allows high-resolution audio streaming over Bluetooth at up to 990 kbps (three times the data of standard SBC). Both the audio transmitter (phone) and receiver (headphones) must support LDAC.
`
  },
  {
    category: 'faqs',
    filename: 'keyboard_mouse_faqs.txt',
    content: `FAQ: Keyboards, Custom Keyboards, and Gaming Mice

Q: What is hot-swappable in mechanical keyboards?
A: A hot-swappable keyboard (like the Keychron Q1 Pro) allows users to pull out and replace the mechanical switches (like switches from Cherry, Gateron, or Kailh) directly without soldering anything. This lets you change the sound and typing feel of your keyboard easily.

Q: Why is my wireless mouse stuttering or lagging?
A: 1. Ensure the USB receiver is within 2 meters of the mouse and away from USB 3.0 ports which can cause Wi-Fi interference.
2. Recharge the battery. Low battery states can cause polling frequency stutters.
3. Clean the optical sensor on the bottom of the mouse with a cotton swab and a drop of isopropyl alcohol.

Q: What is the benefit of a higher polling rate (e.g., 4000Hz or 8000Hz) in gaming mice?
A: Standard gaming mice report their position 1,000 times per second (1000Hz). High polling rate mice (like the Razer DeathAdder V3 Pro with hyperpolling) report up to 8,000 times per second, lowering input latency from 1ms to 0.125ms. This results in smoother cursor movements on high-refresh-rate gaming monitors (240Hz+).
`
  },
  {
    category: 'faqs',
    filename: 'accessory_faqs_csv.csv',
    content: `id,question,answer,product_keywords,category_tag
FAQ-1,How do I clean my mechanical keyboard keycaps?,Remove keycaps using a wire puller. Soak them in warm water mixed with mild soap for 15 minutes. Wipe dry and let air dry completely before re-attaching.,keycap; mechanical keyboard,hardware
FAQ-2,What does IPX4 rating mean on earbuds?,IPX4 means the earbuds are protected against splashing water from any direction. They are sweatproof and safe for exercise but cannot be submerged in water.,water resistance; ipx4; earbuds,safety
FAQ-3,Can I use my custom keyboard on a Mac?,Yes! Most keyboards like Keychron Q1 Pro have a toggle switch on the back to switch between macOS/iOS and Windows/Android configurations.,keychron; mac; toggle,compatibility
FAQ-4,Why does my mouse cursor double click?,This is caused by worn-out mechanical copper switches. High-end mice like Razer DeathAdder V3 Pro use Optical Switches that use light beams instead of physical contacts preventing double-clicking bugs.,double click; razer; optical switch,troubleshooting
FAQ-5,How do I travel with a lithium-battery power bank?,You must carry it inside your carry-on luggage. Power banks are strictly prohibited in checked baggage due to aviation fire hazards. The capacity must be under 100Whr (Anker Prime 20k is 72Whr and fully approved).,power bank; travel; carry-on,travel
`
  },
  {
    category: 'faqs',
    filename: 'gaming_queries_faq.md',
    content: `# FAQ: Gaming Hardware and Displays

### Q: Which laptops are suitable for gaming?
**A**: Look for laptops equipped with dedicated graphics cards (GPUs) such as the NVIDIA GeForce RTX 4070 or RTX 4080 and high refresh rate displays. The ASUS ROG Zephyrus G16 and Acer Predator Helios 16 are highly suitable for gaming due to their dedicated graphics, fast refresh rates (240Hz), and advanced cooling systems.

### Q: Which product has RTX graphics?
**A**: Multiple products in our catalog feature NVIDIA RTX graphics:
- **Dell XPS 15**: Features the NVIDIA GeForce RTX 4070 (8GB VRAM) for creative work and casual gaming.
- **ASUS ROG Zephyrus G16**: Features the elite NVIDIA GeForce RTX 4080 (12GB VRAM) for high-end gaming.
- **Acer Predator Helios 16**: Features the NVIDIA GeForce RTX 4070 (8GB VRAM) running at a high TGP of 140W for extreme performance.
`
  },
  {
    category: 'faqs',
    filename: 'laptop_upgrade_faq.txt',
    content: `FAQ: Laptop Upgrades and Technical Modifications

Q: Which laptop supports 32GB RAM?
A: - Dell XPS 15: Configured with 32GB DDR5 RAM, and supports upgrades up to 64GB since it features 2x SO-DIMM slots.
- Lenovo ThinkPad X1 Carbon: Configured with 32GB LPDDR5 RAM, but note that the RAM is soldered (onboard) and cannot be upgraded later.
- ASUS ROG Zephyrus G16: Configured with 32GB LPDDR5X onboard RAM.
- Apple MacBook Pro 16: Configured with 48GB unified memory (RAM is unified on the Apple Silicon chip and cannot be upgraded after purchase).
- HP Spectre x360 14: Configured with 16GB onboard RAM (no upgrade slots available).

Q: Which laptops support fast charging?
A: - Dell XPS 15: Supports ExpressCharge fast charging (80% in 60 minutes).
- HP Spectre x360: Supports HP Fast Charge (50% in 45 minutes).
- Lenovo ThinkPad X1 Carbon: Supports Rapid Charge (80% in 60 minutes).
- Apple MacBook Pro 16: Supports 140W fast charging via MagSafe (50% in 30 minutes).
- ASUS ROG Zephyrus G16: Supports 100W USB-C Power Delivery fast charging (50% in 30 minutes).
`
  },
  {
    category: 'faqs',
    filename: 'sound_spatial_faq.md',
    content: `# FAQ: Spatial Audio and Codecs

### Q: What is Bose Immersive Audio?
**A**: Bose Immersive Audio is a spatial audio processing feature that makes music sound like it is playing in the room in front of you rather than inside your earbuds. It is supported on the Bose QuietComfort Ultra Earbuds and headphones.

### Q: How do I enable Spatial Audio on Apple products?
**A**: Ensure your Apple Watch Ultra 2 or MacBook Pro is connected to supported spatial audio headphones (like Bose QC Ultra or AirPods). Swipe down to open Control Center, long press the volume slider, and toggle Spatial Audio ON.
`
  },
  {
    category: 'faqs',
    filename: 'keyboard_switches_faq.txt',
    content: `FAQ: Keyboard Switches and Customization

Q: What is the difference between Linear, Tactile, and Clicky mechanical keyboard switches?
A: - Linear switches (e.g. Gateron Red) are smooth and quiet from top to bottom, preferred for fast gaming inputs.
- Tactile switches (e.g. Gateron Brown) have a physical bump in the middle of the keypress, giving tactile feedback without a loud click. Excellent for typing.
- Clicky switches (e.g. Cherry Blue) have both a physical bump and a loud auditory click, preferred by people who love typing sound feedback.

Q: Can I map custom shortcuts to the Keychron Q1 Pro knob?
A: Yes. Connect the keyboard, open usevia.app, go to Layer 0/1/2 and click the knob icon. You can set rotations to zoom in/out, scroll web pages, or adjust keyboard RGB backlight brightness.
`
  },
  {
    category: 'faqs',
    filename: 'powerbank_airplane_faq.md',
    content: `# FAQ: Power Banks and Flight Regulations

### Q: Can I bring my 20,000mAh Anker Prime Power Bank on an airplane?
**A**: Yes. The Anker Prime 20k Power Bank has a rated capacity of 72 Watt-hours (Whr). Federal Aviation Administration (FAA) regulations allow lithium-ion batteries up to 100Whr in carry-on baggage without special airline approval. It must NOT be placed in checked bags.

### Q: How do I calculate the Whr of my device?
**A**: Multiply the battery capacity in Ampere-hours (Ah) by the nominal voltage (V). For example: 20,000mAh = 20Ah. 20Ah * 3.6V = 72Whr.
`
  },

  // ==========================================
  // WARRANTY DOCUMENTS (Markdown / Text)
  // ==========================================
  {
    category: 'warranty',
    filename: 'dell_warranty_policy.md',
    content: `# Dell Hardware Warranty Policy

Thank you for choosing Dell products. This document outlines the warranty coverage, duration, and claim procedures for Dell laptops (including XPS series) purchased through authorized dealers.

## Warranty Period
Dell XPS laptops are covered by a **1-Year Limited Hardware Warranty** starting from the original purchase date (invoice date). 

## What is Covered?
This warranty covers:
- Manufacturing defects in materials and craftsmanship.
- System hardware failures (e.g., motherboard, CPU, built-in OLED screen, RAM, SSD, and integrated speakers).
- Battery capacity issues (only if the battery capacity drops below 60% of original design during the first 12 months).

## What is NOT Covered?
This warranty excludes:
- Accidental damage (spills, drops, cracked screens, liquid immersion).
- Software issues, virus removals, or operating system corruptions.
- Unauthorized modifications, self-repair attempts, or third-party component installations.
- Standard battery wear and tear over time.

## How to File a Warranty Claim
To file a warranty claim:
1. Locate your **Dell Service Tag** (7-digit alphanumeric code on the bottom cover).
2. Visit \`dell.com/support\` or call Dell Customer Care.
3. If hardware failure is diagnosed, Dell will provide **On-Site In-Home Service**. A certified technician will be dispatched to your location within 1 to 2 business days to replace the defective parts free of charge.
`
  },
  {
    category: 'warranty',
    filename: 'hp_warranty_policy.txt',
    content: `HP Product Warranty Terms and Conditions

HP Spectre series laptops are backed by a 1-Year Limited Warranty with standard Mail-In Repair Service.

Extended Protection (HP Care Pack):
Customers can upgrade their warranty up to 3 years of accidental damage protection within the first 90 days of laptop purchase.

Warranty Exclusions:
1. Normal cosmetic wear (scratches on aluminum body, keycap fading).
2. Damage caused by using third-party non-HP AC power adapters.
3. Natural disasters or fire accidents.
4. Data loss. Customers are solely responsible for backup before sending the laptop to the HP Repair Center.

Mail-In Claim Procedure:
1. Contact HP Technical Support at 1-800-HP-INVENT.
2. If mail-in service is approved, HP will send a pre-paid shipping box to your address.
3. Back up all data, shut down, and pack the laptop securely without accessories (unless instructed).
4. Ship the package. Repairs take 5 to 7 business days from the date the device arrives at the HP Depot.
`
  },
  {
    category: 'warranty',
    filename: 'lenovo_thinkpad_warranty.md',
    content: `# Lenovo ThinkPad Corporate Warranty Terms

Lenovo offers a **3-Year Premier Support Warranty** on all enterprise ThinkPad X1 Carbon laptops. This represents our commitment to premium business reliability.

## Key Features
- **3-Year Duration**: Covers all hardware faults for a full 36 months from purchase.
- **24/7 Advanced Support**: Access to advanced technical support lines directly.
- **Next Business Day On-Site Support**: If a problem cannot be fixed remotely, a technician will arrive at your office or home the next business day.
- **International Warranty Service (IWS)**: Travel safely. Lenovo will service your ThinkPad in any country where the specific model is sold.

## Accidental Damage Protection (ADP) Option
Base corporate configurations include ADP, which covers:
- Liquid spills on the spill-resistant keyboard.
- Drop damage from tables or desks.
- Electrical surges.
- Cracked LCD panels.

To file a claim under IWS or local Premier Support, present your invoice and laptop serial number to support.lenovo.com.
`
  },
  {
    category: 'warranty',
    filename: 'apple_hardware_warranty.txt',
    content: `Apple One (1) Year Limited Warranty

Apple warranty terms for hardware products (MacBook Pro, Apple Watch Ultra).

Duration:
One (1) year from the date of original retail purchase.

AppleCare+ Protection Plan:
AppleCare+ extends warranty coverage to 3 years (MacBook) or 2 years (Apple Watch) and includes unlimited incidents of accidental damage protection, each subject to a service fee (e.g. $99 for screen damage). AppleCare+ must be purchased within 60 days of the hardware purchase.

Claim Procedure:
1. Book an appointment at the Genius Bar of your local Apple Store using the Apple Support App.
2. Bring the device and proof of purchase.
3. In most cases, Apple will swap the defective component or device instantly with a new or refurbished equivalent that performs like new.
`
  },
  {
    category: 'warranty',
    filename: 'accessory_warranty_policy.md',
    content: `# Standard Warranty Policy: E-commerce Accessories

This document outlines the standard warranty terms for non-laptop accessories in our catalog (including Sony, Bose, Keychron, Logitech, Razer, DJI, and Anker products).

## Warranty Periods by Manufacturer
- **Sony Headphones (WH-1000XM5)**: 1-Year Limited Warranty (Mail-In).
- **Bose Earbuds (QC Ultra)**: 1-Year Limited Warranty (Replacement).
- **Keychron Keyboards**: 1-Year Manufacturer Warranty.
- **Logitech Keyboards & Mice**: 2-Year Limited Hardware Warranty.
- **Razer Gaming Mice**: 2-Year Limited Mechanical/Optical Switch Warranty.
- **Anker Power Banks**: 18-Month Replacement Warranty (Covers cell decay).
- **DJI Gimbal Cameras**: 1-Year Limited Warranty (Exchange).

## Basic Coverage Rules
Accessories warranties strictly cover manufacturing defects only. Any physical damage (e.g., sweat erosion on sports earbuds, dropped mouse buttons, cracked battery cases, or spilled tea on keyboards) is not eligible for warranty service. 
Defective units inside the warranty window will be fully replaced with a new unit or store credit.
`
  },

  // ==========================================
  // RETURN POLICIES (Markdown / Text)
  // ==========================================
  {
    category: 'returns',
    filename: 'standard_return_policy.md',
    content: `# E-commerce Standard Return Policy

We want you to love your purchase! If you are not completely satisfied, you can return your product under our standard guidelines.

## 30-Day Return Window
Customers have **30 calendar days** from the delivery date of their order to request a return and receive a full refund.

## Conditions for Return
For a return to be accepted and a full refund issued:
- The product must be in **brand-new, unused condition**.
- It must be returned inside the **original manufacturer packaging**, including all cables, manuals, accessories, and promotional items.
- The retail box must not be defaced, written on, or torn.
- Laptops and smartwatches must be **factory reset** with all iCloud, Windows Hello, and personal login accounts completely deleted.

## Restocking Fees
- **Laptops and Curved Monitors**: Returns of opened laptops or monitors will incur a **10% restocking fee** to cover inspection and re-packaging costs.
- **All other accessories**: Opened items in perfect condition are subject to a **5% restocking fee**.
- Unopened items in original sealed wraps are eligible for a **100% full refund** with zero restocking fees.
`
  },
  {
    category: 'returns',
    filename: 'laptop_returns_guide.txt',
    content: `E-commerce Laptop Return Procedures and Guidelines

Return window: 30 days from date of purchase.

Critical Requirements:
1. Proof of Purchase: A copy of the order confirmation or invoice must be placed inside the return parcel.
2. Account Deactivation: Before sending back your laptop (Dell, HP, Lenovo, MacBook), you MUST log out of all accounts:
   - For MacBooks: Sign out of iCloud, Turn off 'Find My Mac', and perform a complete macOS reset.
   - For Windows: Remove corporate MDM accounts, log out of Microsoft Accounts, and reset the PC to factory defaults.
   If a returned laptop is password-protected or locked to a user account, the return will be REJECTED, and the laptop will be shipped back to you at your expense.

Return Shipping Charges:
We provide free return shipping labels for defective items. If the return is due to buyer remorse (change of mind), the buyer is responsible for return shipping costs ($15 flat rate will be deducted from your refund).
`
  },
  {
    category: 'returns',
    filename: 'holiday_extended_returns.md',
    content: `# Holiday Extended Return Policy

To facilitate holiday gift shopping, we offer an extended return period for purchases made during the year-end holiday season.

## Extended Return Window
All physical products purchased between **November 1st and December 25th** of any calendar year are eligible for return until **January 31st** of the subsequent year.

## Return Terms
- Standard return criteria apply: all items must be returned with their original retail box, documentation, and accessories in unused or like-new condition.
- The 10% restocking fee on opened laptops and monitors is **waived** for holiday returns returned in pristine condition.
- Return shipping labels during this window are completely free of charge.
`
  },
  {
    category: 'returns',
    filename: 'damaged_items_returns.txt',
    content: `Damaged, Defective, or Incorrect Deliveries

What should I do if my package arrives damaged?
If your shipping box arrives crushed, wet, or torn, and the product inside is damaged, follow these steps immediately:
1. Take photos of the shipping container and the damaged item.
2. Do not throw away the packaging.
3. Contact customer support at returns@ecommerce.com within 48 hours of delivery.
4. We will issue a prepaid return shipping label and dispatch a replacement unit immediately.

Reporting Window:
Damages or shortages must be reported within 48 hours. Claims submitted after 48 hours of carrier-verified delivery will be rejected under the assumption that the damage occurred post-delivery.
`
  },
  {
    category: 'returns',
    filename: 'refund_processing_info.md',
    content: `# Refund Processing Timelines and FAQ

Once your returned package arrives at our central inspection warehouse, here is what to expect:

## Step-by-Step Refund Process
1. **Inspection (1-2 Business Days)**: Our technicians open the box, inspect the condition, verify accessories, and check serial numbers against your order receipt.
2. **Approval (1 Business Day)**: If the item meets our return guidelines, the refund is approved. Any applicable restocking fees (5% for accessories, 10% for laptops) will be calculated and deducted.
3. **Credit Issuance (3-5 Business Days)**: The refund is posted back to your original payment method (Credit Card, PayPal, or Apple Pay).

## Processing Latencies
Depending on your financial institution, it may take an additional 3 to 10 business days for the credit to appear on your bank statement. Bank wires can take up to 14 days. Store credits are issued instantly upon approval.
`
  },

  // ==========================================
  // SHIPPING POLICIES (Markdown / Text)
  // ==========================================
  {
    category: 'shipping',
    filename: 'standard_shipping_policy.md',
    content: `# E-commerce Shipping and Delivery Policies

We offer flexible shipping options to ensure your e-commerce products arrive safely and quickly.

## Shipping Options and Costs
- **Standard Ground Shipping**: FREE for orders over $50. For orders under $50, a flat rate of $4.99 applies. Delivery takes 3 to 5 business days.
- **Express Shipping**: Flat rate of $14.99 for all orders. Delivery takes 1 to 2 business days.
- **Next-Day Delivery**: Flat rate of $29.99. Order must be placed before 1:00 PM EST for delivery on the next business day.

## Order Processing
Orders are processed and handed to carriers (UPS, FedEx, DHL) Monday through Friday. Orders placed on weekends or national holidays will be processed on the next business day.
`
  },
  {
    category: 'shipping',
    filename: 'international_shipping_guide.txt',
    content: `International Shipping and Customs Regulations

We ship products to over 60 countries worldwide.

International Carriers:
All international orders are shipped via DHL Express or FedEx International Priority to ensure tracking reliability.

Duties and Taxes (DDP vs DDU):
1. Deliveries Duty Paid (DDP): During checkout, international taxes, VAT, and custom duties are calculated and collected. We handle the custom clearing, and no additional fees are charged upon delivery.
2. Deliveries Duty Unpaid (DDU): For certain countries, taxes and duties are not collected at checkout. The customer is solely responsible for paying custom clearance fees to the local post or carrier upon delivery.

Delivery Timelines:
- Canada and Mexico: 2 to 3 business days.
- Europe and UK: 3 to 5 business days.
- Asia-Pacific: 5 to 7 business days.
Note: Custom clearance delays are not factored into these timelines and can take an additional 1 to 3 days.
`
  },
  {
    category: 'shipping',
    filename: 'shipping_restrictions.md',
    content: `# Shipping Restrictions and Hazardous Materials

Certain high-performance products are subject to transport safety regulations.

## Lithium-Ion Battery Shipping (Power Banks, Laptops)
Due to FAA and international air transit safety rules regarding large lithium batteries:
- Power banks (like the Anker Prime 20k) and laptops cannot be shipped via **Express Air** or **Next-Day Delivery** to certain offshore locations (including Alaska, Hawaii, Puerto Rico, and US military APO/FPO bases).
- These items must be shipped via standard **Ground Shipping** (surface freight) to comply with safety restrictions.

## Oversized Packages (Odyssey Neo G9)
High-volume packages like the Samsung 57" Curved Monitor require special handling:
- Oversized packages are shipped exclusively via freight carriers (LTL freight).
- The carrier will call the telephone number on the order to schedule a delivery appointment window.
- Signature is strictly required upon delivery.
`
  },
  {
    category: 'shipping',
    filename: 'tracking_and_signature.txt',
    content: `Order Tracking and Delivery Signature Rules

Tracking Information:
Within 12 hours of order shipment, we will email your tracking link (UPS or FedEx). You can also view your live tracking codes in the client dashboard.

Signature Requirements:
To prevent package theft ("porch piracy"), we require a signature upon delivery for high-value orders:
- **Orders over $300**: Signature is highly recommended. You can waive it in the carrier portal.
- **Orders over $800**: Direct Signature is strictly REQUIRED. The carrier will not leave the package at your door or with a neighbor without a physical signature. If you are not home, the carrier will make 3 delivery attempts before returning the package to our warehouse.
`
  },
  {
    category: 'shipping',
    filename: 'lost_packages_policy.md',
    content: `# Lost, Stolen, or Missing Shipments Policy

If your tracking status shows "Delivered" but you cannot locate your package, follow these guidelines to resolve the issue:

## Action Checklist
1. **Check Surroundings**: Look around porches, garages, side doors, and check with neighbors or apartment front offices.
2. **Wait 24 Hours**: Carriers sometimes scan packages as "delivered" up to a day before they physically arrive.
3. **File a Carrier Claim**: Contact UPS or FedEx to initiate a GPS trace on the delivery scanner.

## Our Claim Reporting Window
All missing packages must be reported to our customer service within **5 business days** of the carrier-marked delivery date. If a package is confirmed stolen or lost in transit after investigation, we will issue a replacement shipment or a 100% refund. Claims submitted after 5 business days will not be approved.
`
  }
];

// Add filler documents to make sure we have exactly 52+ documents.
const extraDocs: Doc[] = [
  {
    category: 'faqs',
    filename: 'dji_gimbal_charging_faq.md',
    content: `# FAQ: DJI Osmo Pocket 3 Charging Guides

### Q: Which wall charger is recommended for the DJI Osmo Pocket 3?
**A**: The Osmo Pocket 3 supports fast charging up to 65W. We recommend using a high-quality USB-C PD charger such as the DJI 65W Portable Charger, or an Anker Prime wall charger. A compatible fast charger can charge the gimbal camera to 80% in just 16 minutes.

### Q: Can I use the gimbal while it is charging?
**A**: Yes. You can record video and use tracking modes while charging via a USB-C cable or while connected to a power bank. However, this will generate more heat, which might trigger temporary high-temperature warnings in hot environments.
`
  },
  {
    category: 'faqs',
    filename: 'mouse_grip_faq.txt',
    content: `FAQ: Mouse Ergonomics and Grips

Q: What are palm, claw, and fingertip grips?
A: These are the three primary mouse grip styles used by computer users and gamers:
1. Palm Grip: The entire hand rests flat on the mouse, providing excellent control and support. Perfect for ergonomic mice like Razer DeathAdder V3 Pro.
2. Claw Grip: The palm rests on the back edge of the mouse, and the fingers are arched like claws over the buttons, favored for quick click reactions.
3. Fingertip Grip: Only the tips of the fingers contact the mouse, allowing for rapid cursor movements, favored by players with ultra-light mice.
`
  }
];

const allDocuments = [...documents, ...extraDocs];

async function generateDataset() {
  console.log(`🚀 Starting sample dataset generation. Target directory: ${DATASET_DIR}`);
  
  // Ensure base directory exists
  if (!fs.existsSync(DATASET_DIR)) {
    fs.mkdirSync(DATASET_DIR, { recursive: true });
  }

  // Set to track created categories
  const categories = new Set<string>();

  for (const doc of allDocuments) {
    categories.add(doc.category);
    const categoryFolder = path.join(DATASET_DIR, doc.category);
    
    if (!fs.existsSync(categoryFolder)) {
      fs.mkdirSync(categoryFolder, { recursive: true });
    }

    const filePath = path.join(categoryFolder, doc.filename);
    fs.writeFileSync(filePath, doc.content, 'utf8');
  }

  console.log(`✅ Dataset generation completed successfully!`);
  console.log(`📁 Total Categories created: ${categories.size} (${Array.from(categories).join(', ')})`);
  console.log(`📄 Total Documents generated: ${allDocuments.length} files.`);
}

generateDataset().catch((err) => {
  console.error(`❌ Error generating dataset:`, err);
  process.exit(1);
});
