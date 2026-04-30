export interface GuideStep {
  stepNumber: number;
  title: string;
  description: string;
  warning?: string;
}

export interface Guide {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  estimatedTime: string;
  estimatedSavings: string;
  toolsNeeded: string[];
  partsNeeded: string[];
  steps: GuideStep[];
  warnings?: string[];
}

export const hardcodedGuides: Guide[] = [
  {
    id: 'oil',
    title: 'How to Change Your Oil',
    difficulty: 'Easy',
    estimatedTime: '30-45 min',
    estimatedSavings: '$30-50',
    toolsNeeded: ['Socket wrench set', 'Oil filter wrench', 'Drain pan', 'Funnel', 'Jack & jack stands'],
    partsNeeded: ["Engine oil (check owner's manual for spec)", 'Oil filter'],
    steps: [
      {
        stepNumber: 1,
        title: 'Prepare the vehicle',
        description:
          'Park on a level surface. Warm up the engine for 2-3 minutes (warm oil drains better). Turn off the engine. Engage parking brake.',
      },
      {
        stepNumber: 2,
        title: 'Lift the vehicle',
        description:
          "Use a jack to lift the front of the car. Secure with jack stands. Never work under a car supported only by a jack.",
      },
      {
        stepNumber: 3,
        title: 'Locate the drain plug',
        description:
          'Slide under the car and find the oil drain plug on the bottom of the oil pan. Place your drain pan underneath.',
      },
      {
        stepNumber: 4,
        title: 'Drain the oil',
        description:
          'Using the correct socket, loosen and remove the drain plug. Let the oil drain completely. This takes 5-10 minutes.',
        warning: 'Oil may be hot. Wear gloves.',
      },
      {
        stepNumber: 5,
        title: 'Remove old oil filter',
        description:
          'Locate the oil filter. Use an oil filter wrench to remove it. Some oil will spill — keep the drain pan nearby.',
      },
      {
        stepNumber: 6,
        title: 'Install new oil filter',
        description:
          'Apply a thin layer of new oil to the gasket of the new filter. Hand-tighten the new filter — do NOT over-tighten.',
      },
      {
        stepNumber: 7,
        title: 'Replace drain plug',
        description:
          'Reinstall the drain plug and tighten to spec. Do not over-tighten or you risk stripping the threads.',
      },
      {
        stepNumber: 8,
        title: 'Add new oil',
        description:
          "Lower the car. Open the oil filler cap on top of the engine. Using a funnel, pour in the correct amount and type of oil per your owner's manual.",
      },
      {
        stepNumber: 9,
        title: 'Check the level',
        description:
          'Wait 2 minutes, then check the oil level with the dipstick. Add more if needed. The level should be between the min and max marks.',
      },
      {
        stepNumber: 10,
        title: 'Start and verify',
        description:
          'Start the engine and let it run for 30 seconds. Check under the car for leaks around the drain plug and filter. Turn off and recheck the oil level.',
      },
    ],
  },
  {
    id: 'brakes',
    title: 'Brake Pad Replacement',
    difficulty: 'Moderate',
    estimatedTime: '1-2 hours',
    estimatedSavings: '$100-200',
    toolsNeeded: ['Socket wrench set', 'C-clamp or brake piston tool', 'Jack & jack stands', 'Wire brush'],
    partsNeeded: ['Brake pads (front or rear set)', 'Brake cleaner spray'],
    steps: [
      {
        stepNumber: 1,
        title: 'Prepare the vehicle',
        description:
          'Park on a level surface. Loosen the lug nuts slightly (do not remove). Engage parking brake.',
      },
      {
        stepNumber: 2,
        title: 'Lift and remove wheel',
        description:
          'Jack up the car and secure on jack stands. Remove the lug nuts and wheel.',
      },
      {
        stepNumber: 3,
        title: 'Remove caliper',
        description:
          "Locate the brake caliper. Remove the two caliper bolts (usually 12mm or 14mm). Slide the caliper off the rotor. Do NOT let it hang by the brake line — support it with a wire or bungee cord.",
      },
      {
        stepNumber: 4,
        title: 'Remove old pads',
        description:
          'Slide the old brake pads out of the caliper bracket. Note how they are positioned for reinstallation.',
      },
      {
        stepNumber: 5,
        title: 'Compress the piston',
        description:
          'Use a C-clamp or brake piston tool to push the caliper piston back in. This makes room for the thicker new pads.',
        warning: 'Check brake fluid reservoir — it may overflow as you compress the piston.',
      },
      {
        stepNumber: 6,
        title: 'Install new pads',
        description:
          'Slide the new brake pads into the caliper bracket. Make sure any wear indicators face the correct direction.',
      },
      {
        stepNumber: 7,
        title: 'Reinstall caliper',
        description:
          'Slide the caliper back over the new pads and rotor. Reinstall and tighten the caliper bolts.',
      },
      {
        stepNumber: 8,
        title: 'Reinstall wheel',
        description:
          'Put the wheel back on. Hand-tighten lug nuts in a star pattern. Lower the car. Torque lug nuts to spec.',
      },
      {
        stepNumber: 9,
        title: 'Bed the brakes',
        description:
          'Before driving normally, do 5-6 moderate stops from 60 km/h to 20 km/h to properly bed the new pads. Avoid hard braking for the first 200 km.',
      },
    ],
  },
  {
    id: 'tires',
    title: 'Tire Rotation & Inspection',
    difficulty: 'Easy',
    estimatedTime: '20-30 min',
    estimatedSavings: '$20-40',
    toolsNeeded: ['Jack & jack stands', 'Lug wrench or impact wrench', 'Tire pressure gauge'],
    partsNeeded: [],
    steps: [
      {
        stepNumber: 1,
        title: 'Check rotation pattern',
        description:
          'For most front-wheel drive cars: move fronts straight to the rear, move rears to the front crossing sides. Check your owner’s manual for the correct pattern.',
      },
      {
        stepNumber: 2,
        title: 'Loosen all lug nuts',
        description:
          'With the car on the ground, slightly loosen all lug nuts on all four wheels. Do not remove them yet.',
      },
      {
        stepNumber: 3,
        title: 'Lift the vehicle',
        description:
          'Jack up one corner at a time, or if you have 4 jack stands, lift the entire car. Always use jack stands — never just a jack.',
      },
      {
        stepNumber: 4,
        title: 'Move the tires',
        description:
          'Remove each wheel and move it to its new position according to the rotation pattern.',
      },
      {
        stepNumber: 5,
        title: 'Tighten lug nuts',
        description:
          'Hand-tighten all lug nuts. Lower the car. Torque each lug nut to spec in a star pattern.',
      },
      {
        stepNumber: 6,
        title: 'Set tire pressure',
        description:
          'Check and adjust all four tires to the manufacturer-recommended PSI (found on the driver’s door jamb sticker).',
      },
      {
        stepNumber: 7,
        title: 'Inspect tires',
        description:
          'Check for uneven wear, cracks, bulges, or nails. Check tread depth — if a penny test shows Lincoln’s full head, the tire needs replacing.',
      },
    ],
  },
  {
    id: 'coolant',
    title: 'Coolant Flush & Replace',
    difficulty: 'Easy',
    estimatedTime: '30-45 min',
    estimatedSavings: '$40-80',
    toolsNeeded: ['Drain pan', 'Funnel', 'Pliers', 'Garden hose (optional)'],
    partsNeeded: ["Coolant/antifreeze (check owner's manual for type)", 'Distilled water'],
    steps: [
      {
        stepNumber: 1,
        title: 'Let engine cool',
        description:
          'NEVER open the coolant system on a hot engine. Wait at least 30 minutes after driving.',
        warning: 'Hot coolant can cause severe burns. Always wait for the engine to cool completely.',
      },
      {
        stepNumber: 2,
        title: 'Place drain pan',
        description:
          'Locate the radiator drain plug (petcock) at the bottom of the radiator. Place a drain pan underneath.',
      },
      {
        stepNumber: 3,
        title: 'Drain old coolant',
        description:
          'Open the petcock and let the old coolant drain completely. Also remove the radiator cap to speed up draining.',
      },
      {
        stepNumber: 4,
        title: 'Flush the system',
        description:
          'Close the petcock. Fill the system with distilled water. Run the engine for 5 minutes with the heater on high. Let it cool, then drain again.',
      },
      {
        stepNumber: 5,
        title: 'Fill with new coolant',
        description:
          'Close the petcock. Fill the system with the correct coolant mixture (usually 50/50 coolant and distilled water). Fill slowly to avoid air pockets.',
      },
      {
        stepNumber: 6,
        title: 'Bleed air',
        description:
          "With the radiator cap off, run the engine until the thermostat opens (you'll see coolant flowing). Top off as the level drops. Replace the cap.",
      },
      {
        stepNumber: 7,
        title: 'Check for leaks',
        description:
          'Let the engine run for 10 minutes. Check around the petcock, hoses, and radiator for any leaks. Check the coolant level after the engine cools.',
      },
    ],
  },
  {
    id: 'air-filter',
    title: 'Engine Air Filter Change',
    difficulty: 'Easy',
    estimatedTime: '10-15 min',
    estimatedSavings: '$15-25',
    toolsNeeded: ['None or a screwdriver (depending on housing type)'],
    partsNeeded: ['Engine air filter (check fitment for your vehicle)'],
    steps: [
      {
        stepNumber: 1,
        title: 'Locate the air filter box',
        description:
          "Open the hood. Find the air filter housing — it's usually a large black plastic box near the front of the engine bay connected to a large hose.",
      },
      {
        stepNumber: 2,
        title: 'Open the housing',
        description:
          'Unclip the metal clips or unscrew the screws holding the housing lid. Lift the lid carefully.',
      },
      {
        stepNumber: 3,
        title: 'Remove old filter',
        description:
          'Pull out the old air filter. Note which direction it faces (usually marked with an arrow showing airflow direction).',
      },
      {
        stepNumber: 4,
        title: 'Clean the housing',
        description:
          'Wipe out any dirt, leaves, or debris inside the filter housing with a clean rag.',
      },
      {
        stepNumber: 5,
        title: 'Install new filter',
        description:
          'Place the new filter in the same orientation as the old one. Make sure it seats properly with no gaps around the edges.',
      },
      {
        stepNumber: 6,
        title: 'Close and secure',
        description:
          'Replace the housing lid. Secure all clips or screws. Make sure the seal is tight — any gaps let unfiltered air into the engine.',
      },
    ],
  },
  {
    id: 'spark',
    title: 'Spark Plug Replacement',
    difficulty: 'Moderate',
    estimatedTime: '45-90 min',
    estimatedSavings: '$40-80',
    toolsNeeded: ['Spark plug socket', 'Socket wrench with extension', 'Torque wrench', 'Gap gauge'],
    partsNeeded: ['Spark plugs (correct type for your engine)', 'Anti-seize compound (optional)'],
    steps: [
      {
        stepNumber: 1,
        title: 'Let engine cool',
        description:
          'Work on a completely cold engine. Spark plugs are easier to remove and you won’t burn yourself on the exhaust manifold.',
      },
      {
        stepNumber: 2,
        title: 'Access spark plugs',
        description:
          'Remove the engine cover if present. Locate the ignition coils or spark plug wires on top of the engine.',
      },
      {
        stepNumber: 3,
        title: 'Remove coil/wire',
        description:
          'Disconnect the electrical connector from the ignition coil. Remove the coil bolt and pull the coil straight up. Work one cylinder at a time.',
      },
      {
        stepNumber: 4,
        title: 'Remove old spark plug',
        description:
          'Use a spark plug socket with extension to unscrew the old plug. Turn counter-clockwise. Pull it out and inspect it.',
      },
      {
        stepNumber: 5,
        title: 'Check the gap',
        description:
          "Check the new spark plug gap with a gap gauge. Compare to the spec on the underhood sticker or owner's manual. Adjust if needed.",
      },
      {
        stepNumber: 6,
        title: 'Install new plug',
        description:
          'Thread the new plug in BY HAND first to avoid cross-threading. Then tighten with a torque wrench to the manufacturer’s spec.',
      },
      {
        stepNumber: 7,
        title: 'Reinstall coil',
        description:
          'Push the coil back down onto the spark plug. Reinstall the bolt. Reconnect the electrical connector.',
      },
      {
        stepNumber: 8,
        title: 'Repeat for all cylinders',
        description:
          'Do one cylinder at a time. Do not mix up coil positions on engines where coils are matched to cylinders.',
      },
      {
        stepNumber: 9,
        title: 'Start and test',
        description:
          'Start the engine. It should idle smoothly. If you notice misfires or rough running, double-check all connections.',
      },
    ],
  },
  {
    id: 'battery',
    title: 'Battery Testing & Replace',
    difficulty: 'Easy',
    estimatedTime: '15-30 min',
    estimatedSavings: '$30-50',
    toolsNeeded: ['Wrench set (usually 10mm)', 'Wire brush or battery terminal cleaner', 'Multimeter (optional)'],
    partsNeeded: ['Replacement battery (correct group size)', 'Battery terminal grease'],
    steps: [
      {
        stepNumber: 1,
        title: 'Test the battery',
        description:
          'With the engine off, set a multimeter to DC voltage and touch the probes to the terminals. 12.6V+ is fully charged. Below 12.2V needs charging or replacement.',
      },
      {
        stepNumber: 2,
        title: 'Turn off everything',
        description:
          'Turn off the engine, lights, radio, and all accessories. Remove the key from the ignition.',
      },
      {
        stepNumber: 3,
        title: 'Disconnect negative first',
        description:
          'Always remove the NEGATIVE (black, minus) terminal first. Loosen the nut and pull the cable off.',
        warning: 'Always disconnect negative first to prevent short circuits.',
      },
      {
        stepNumber: 4,
        title: 'Disconnect positive',
        description:
          'Remove the POSITIVE (red, plus) terminal next.',
      },
      {
        stepNumber: 5,
        title: 'Remove the battery',
        description:
          'Remove any hold-down clamp or bracket. Lift the battery straight out. Batteries are heavy (30-50 lbs).',
      },
      {
        stepNumber: 6,
        title: 'Clean the terminals',
        description:
          'Use a wire brush to clean any corrosion from the cable terminals and the battery tray.',
      },
      {
        stepNumber: 7,
        title: 'Install new battery',
        description:
          "Place the new battery in the tray. Make sure it's oriented correctly (positive and negative on the right sides). Reinstall the hold-down clamp.",
      },
      {
        stepNumber: 8,
        title: 'Connect positive first',
        description:
          'Connect the POSITIVE (red) terminal first. Tighten securely. Apply terminal grease.',
      },
      {
        stepNumber: 9,
        title: 'Connect negative',
        description:
          'Connect the NEGATIVE (black) terminal. Tighten securely. You may hear a small spark — this is normal.',
      },
      {
        stepNumber: 10,
        title: 'Test',
        description:
          'Start the engine. Check that all electronics work. You may need to reset your clock and radio presets.',
      },
    ],
  },
  {
    id: 'cabin-filter',
    title: 'Cabin Air Filter Replace',
    difficulty: 'Easy',
    estimatedTime: '10-20 min',
    estimatedSavings: '$20-40',
    toolsNeeded: ['None or a small screwdriver'],
    partsNeeded: ['Cabin air filter (correct size for your vehicle)'],
    steps: [
      {
        stepNumber: 1,
        title: 'Locate the cabin filter',
        description:
          "Most cabin filters are behind the glove box. Some are under the dashboard or under the hood near the windshield. Check your owner's manual.",
      },
      {
        stepNumber: 2,
        title: 'Access the filter',
        description:
          'If behind the glove box: open the glove box, squeeze the sides to release the stops, and lower it. You’ll see the filter housing behind it.',
      },
      {
        stepNumber: 3,
        title: 'Remove old filter',
        description:
          'Open the filter housing cover (usually clips or a small tab). Slide the old filter out. Note the airflow direction arrow.',
      },
      {
        stepNumber: 4,
        title: 'Install new filter',
        description:
          'Slide the new filter in with the airflow arrow pointing in the same direction as the old one. Close the housing cover.',
      },
      {
        stepNumber: 5,
        title: 'Reassemble',
        description:
          'Push the glove box back up and snap it into place. Test the HVAC system — you should notice improved airflow and less musty smell.',
      },
    ],
  },
  {
    id: 'trans-fluid',
    title: 'Transmission Fluid Check',
    difficulty: 'Moderate',
    estimatedTime: '30-60 min',
    estimatedSavings: '$50-100',
    toolsNeeded: ['Funnel', 'Clean rag', 'Drain pan (if changing)'],
    partsNeeded: ['Transmission fluid (correct type — check owner’s manual)'],
    steps: [
      {
        stepNumber: 1,
        title: 'Warm up the transmission',
        description:
          'Drive for 10-15 minutes to warm the fluid to operating temperature. This gives an accurate reading.',
      },
      {
        stepNumber: 2,
        title: 'Locate the dipstick',
        description:
          'With the engine running in Park, find the transmission dipstick (usually red or orange handle, toward the back of the engine bay). Some cars have no dipstick and require a mechanic.',
      },
      {
        stepNumber: 3,
        title: 'Check the fluid',
        description:
          'Pull the dipstick, wipe it clean, reinsert fully, then pull again. The level should be in the "Hot" range. The fluid should be pink/red and not smell burnt.',
      },
      {
        stepNumber: 4,
        title: 'Evaluate condition',
        description:
          'Good: pink/red, transparent. Needs attention: dark red/brown. Bad: very dark, smells burnt, has particles. If bad, a drain-and-fill is recommended.',
      },
      {
        stepNumber: 5,
        title: 'Top off if needed',
        description:
          'If low, add the correct transmission fluid through the dipstick tube using a long funnel. Add small amounts and recheck. Do not overfill.',
      },
    ],
  },
  {
    id: 'wipers',
    title: 'Windshield Wiper Replacement',
    difficulty: 'Easy',
    estimatedTime: '5-10 min',
    estimatedSavings: '$10-20',
    toolsNeeded: ['None'],
    partsNeeded: ['Wiper blades (correct size — driver and passenger are often different lengths)'],
    steps: [
      {
        stepNumber: 1,
        title: 'Lift the wiper arm',
        description:
          'Pull the wiper arm away from the windshield until it stays up on its own. Be careful — if it snaps back it can crack the windshield.',
      },
      {
        stepNumber: 2,
        title: 'Remove old blade',
        description:
          'Find the release tab where the blade connects to the arm. Press or lift the tab and slide the blade off. The mechanism varies by type (hook, pinch tab, bayonet).',
      },
      {
        stepNumber: 3,
        title: 'Attach new blade',
        description:
          'Slide the new blade onto the arm until it clicks into place. Most new blades come with adapters for different arm types.',
      },
      {
        stepNumber: 4,
        title: 'Test',
        description:
          'Gently lower the arm back to the windshield. Spray washer fluid and test the wipers. They should wipe cleanly with no streaks or chatter.',
      },
    ],
  },
  {
    id: 'headlights',
    title: 'Headlight Bulb Change',
    difficulty: 'Easy',
    estimatedTime: '15-30 min',
    estimatedSavings: '$20-40',
    toolsNeeded: ['Gloves (do not touch halogen bulbs with bare hands)', 'Screwdriver (some vehicles)'],
    partsNeeded: ['Replacement bulb (check owner’s manual for bulb number)'],
    steps: [
      {
        stepNumber: 1,
        title: 'Access the bulb',
        description:
          'Open the hood. Locate the back of the headlight assembly. You may need to remove an air intake, battery, or dust cover for access.',
      },
      {
        stepNumber: 2,
        title: 'Disconnect the connector',
        description:
          'Unplug the electrical connector from the back of the bulb. It usually has a tab you press to release.',
      },
      {
        stepNumber: 3,
        title: 'Remove old bulb',
        description:
          'Depending on type: twist the bulb holder counter-clockwise, unclip a retaining wire, or pull straight out.',
      },
      {
        stepNumber: 4,
        title: 'Install new bulb',
        description:
          'Insert the new bulb without touching the glass (oils from skin cause hot spots and premature failure). Use gloves. Secure the bulb in place.',
        warning: 'Never touch a halogen bulb with bare fingers.',
      },
      {
        stepNumber: 5,
        title: 'Reconnect and test',
        description:
          'Plug the electrical connector back in. Turn on headlights to verify the new bulb works. Check both low and high beam.',
      },
    ],
  },
  {
    id: 'serpentine',
    title: 'Serpentine Belt Inspection',
    difficulty: 'Hard',
    estimatedTime: '1-2 hours',
    estimatedSavings: '$50-100',
    toolsNeeded: ['Serpentine belt tool or long ratchet', 'Flashlight'],
    partsNeeded: ['Replacement belt (if worn)'],
    steps: [
      {
        stepNumber: 1,
        title: 'Locate the belt',
        description:
          "Open the hood and find the serpentine belt — it's the long rubber belt that wraps around multiple pulleys at the front of the engine.",
      },
      {
        stepNumber: 2,
        title: 'Find the routing diagram',
        description:
          'Look for a belt routing diagram on a sticker under the hood. If none, take a photo of the current routing before removing anything.',
      },
      {
        stepNumber: 3,
        title: 'Inspect the belt',
        description:
          'Check for cracks, fraying, glazing (shiny surface), missing chunks, or excessive wear. Also check for squealing when the engine runs.',
      },
      {
        stepNumber: 4,
        title: 'Check tension',
        description:
          'Push on the belt midway between two pulleys. It should deflect about 1/2 inch. Most modern cars have an automatic tensioner — check that it’s not fully extended.',
      },
      {
        stepNumber: 5,
        title: 'Release the tensioner',
        description:
          'If replacing: use a serpentine belt tool or long ratchet on the tensioner pulley bolt. Rotate to release tension. Slide the belt off.',
      },
      {
        stepNumber: 6,
        title: 'Install new belt',
        description:
          'Route the new belt following the diagram. Leave one pulley for last (usually the tensioner). Pull the tensioner, slip the belt on, and slowly release.',
      },
      {
        stepNumber: 7,
        title: 'Verify routing',
        description:
          'Double-check that the belt is properly seated on ALL pulleys. A misaligned belt will be destroyed in seconds.',
      },
      {
        stepNumber: 8,
        title: 'Start and test',
        description:
          'Start the engine. Watch the belt for 30 seconds to make sure it tracks straight on all pulleys. Listen for any squealing.',
      },
    ],
  },
];
