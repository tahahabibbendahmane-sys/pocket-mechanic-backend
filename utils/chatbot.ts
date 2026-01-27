import { Vehicle, ServiceRecord } from '@/types/vehicle';
import { formatMileage } from './formatting';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function buildSystemPrompt(
  activeCar: Vehicle | null,
  unitSystem: 'metric' | 'imperial' = 'metric',
  language: 'en' | 'fr' | 'es' = 'en',
  userName: string | null = null
): string {
  // Dev-only logging
  if (__DEV__) {
    if (!activeCar) {
      console.warn('[Wrenchy] Missing car data in system prompt');
    } else {
      if (!activeCar.make || !activeCar.model || !activeCar.year) {
        console.warn('[Wrenchy] Missing required car fields:', {
          hasMake: !!activeCar.make,
          hasModel: !!activeCar.model,
          hasYear: !!activeCar.year,
        });
      }
      if (typeof activeCar.mileage !== 'number' || activeCar.mileage < 0) {
        console.warn('[Wrenchy] Invalid mileage value:', activeCar.mileage);
      }
    }
  }
  
  if (!activeCar) {
    const userNameGreeting = userName ? `\nThe user's name is ${userName}. You can address them by name when appropriate, but don't overuse it.` : '';
    
    return `You are **Wrenchy**, an expert mechanic AI. The user has not selected a specific vehicle, so answer their questions with general automotive knowledge.${userNameGreeting}

=== STRICT RULES ===
1. TOPIC LIMITATION: You ONLY answer questions about:
   - Vehicle maintenance and service schedules
   - Service intervals and when services are due
   - Maintenance recommendations based on mileage/age
   - Service history interpretation
   - Vehicle ownership best practices
   - General automotive knowledge and best practices
   
   If asked about anything else (repairs, diagnostics, parts, pricing, etc.), politely redirect: "I focus on maintenance scheduling and service tracking. For that question, you'd need to consult a mechanic or service manual."

2. GENERAL MODE: Since no specific vehicle is selected, provide general automotive advice that applies broadly. You can:
   - Give general maintenance recommendations
   - Explain common service intervals
   - Provide general automotive knowledge
   - Suggest best practices for vehicle ownership

3. UNIT SYSTEM: All distances are in ${unitSystem === 'imperial' ? 'miles' : 'km'}. Always use ${unitSystem === 'imperial' ? 'miles' : 'km'} in your responses.

=== RESPONSE GUIDELINES ===
- Speak as a friendly mechanic, not an AI assistant
- Use simple, clear language
- Provide general advice that applies to most vehicles
- If asked about something specific that requires vehicle data, suggest: "For specific advice about your vehicle, add it in the Garage tab and I can give you personalized recommendations."
- Keep responses concise and actionable
- Always use ${unitSystem === 'imperial' ? 'miles' : 'km'} for distances
- Respond in ${language === 'en' ? 'English' : language === 'fr' ? 'French' : 'Spanish'}

Remember: You're providing general automotive knowledge. For personalized advice, the user should add their vehicle in the Garage.`;
  }

  const unitLabel = unitSystem === 'imperial' ? 'miles' : 'km';
  const currentMileage = activeCar.mileage;
  const displayMileage = unitSystem === 'imperial' 
    ? Math.round(currentMileage * 0.621371) 
    : currentMileage;

  const carDetails = [
    `Make: ${activeCar.make}`,
    `Model: ${activeCar.model}`,
    `Year: ${activeCar.year}`,
    activeCar.engine ? `Engine: ${activeCar.engine}` : null,
    `Current Mileage: ${displayMileage.toLocaleString()} ${unitLabel}`,
  ]
    .filter(Boolean)
    .join('\n');

  const services = activeCar.services || [];

  // Helper to format mileage with unit system
  const formatMileageWithUnit = (km: number) => {
    const value = unitSystem === 'imperial' ? Math.round(km * 0.621371) : Math.round(km);
    return `${value.toLocaleString()} ${unitLabel}`;
  };

  // Calculate maintenance status for each service
  const maintenanceStatus = services.map((service) => {
    const milesSinceService = currentMileage - service.mileageDone;
    const milesRemaining = service.intervalMiles - milesSinceService;
    const isOverdue = milesRemaining <= 0;
    const dueSoonThreshold = unitSystem === 'imperial' ? 500 : 800; // ~500 miles = ~800 km
    const dueSoon = milesRemaining > 0 && milesRemaining <= dueSoonThreshold;

    return {
      type: service.type,
      mileageDone: service.mileageDone,
      intervalMiles: service.intervalMiles,
      milesRemaining,
      isOverdue,
      dueSoon,
      date: service.date,
    };
  });

  const overdueServices = maintenanceStatus.filter((s) => s.isOverdue);
  const dueSoonServices = maintenanceStatus.filter((s) => s.dueSoon && !s.isOverdue);
  const dueSoonThreshold = unitSystem === 'imperial' ? 500 : 800;
  const upcomingThreshold = unitSystem === 'imperial' ? 1000 : 1600;
  const upcomingServices = maintenanceStatus.filter((s) => !s.isOverdue && s.milesRemaining <= upcomingThreshold);

  let maintenanceSummary = '';
  if (services.length === 0) {
    maintenanceSummary = 'No service history available.';
  } else {
    maintenanceSummary = `Service Records:\n`;
    maintenanceStatus.forEach((status) => {
      const serviceType = status.type.charAt(0).toUpperCase() + status.type.slice(1);
      maintenanceSummary += `- ${serviceType} Service: Done at ${formatMileageWithUnit(status.mileageDone)}, Interval: ${formatMileageWithUnit(status.intervalMiles)}, `;
      if (status.isOverdue) {
        maintenanceSummary += `OVERDUE by ${formatMileageWithUnit(Math.abs(status.milesRemaining))}\n`;
      } else {
        maintenanceSummary += `${formatMileageWithUnit(status.milesRemaining)} remaining\n`;
      }
    });

    if (overdueServices.length > 0) {
      maintenanceSummary += `\nOVERDUE SERVICES: ${overdueServices.map((s) => s.type).join(', ')}\n`;
    }
    if (dueSoonServices.length > 0) {
      maintenanceSummary += `\nDUE SOON SERVICES (within ${formatMileageWithUnit(dueSoonThreshold)}): ${dueSoonServices.map((s) => s.type).join(', ')}\n`;
    }
    if (upcomingServices.length > 0 && upcomingServices.length > dueSoonServices.length) {
      maintenanceSummary += `\nUPCOMING SERVICES (within ${formatMileageWithUnit(upcomingThreshold)}): ${upcomingServices.map((s) => s.type).join(', ')}\n`;
    }
  }

  // Identify missing data
  const missingData: string[] = [];
  if (!activeCar.engine) {
    missingData.push('Engine specification');
  }
  if (services.length === 0) {
    missingData.push('Service history');
  }

  const userNameGreeting = userName ? `\nThe user's name is ${userName}. You can address them by name when appropriate, but don't overuse it.` : '';

  return `You are **Wrenchy**, a friendly professional mechanic mascot who helps car owners with vehicle maintenance, service, and ownership questions.${userNameGreeting}

=== STRICT RULES ===
1. TOPIC LIMITATION: You ONLY answer questions about:
   - Vehicle maintenance and service schedules
   - Service intervals and when services are due
   - Maintenance recommendations based on mileage/age
   - Service history interpretation
   - Vehicle ownership best practices
   
   If asked about anything else (repairs, diagnostics, parts, pricing, etc.), politely redirect: "I focus on maintenance scheduling and service tracking. For that question, you'd need to consult a mechanic or service manual."

2. DATA REQUIREMENTS: You MUST base ALL answers on the vehicle data provided below. You CANNOT:
   - Invent service intervals not in the data
   - Assume service history that isn't recorded
   - Provide generic advice without mileage context
   - Make up symptoms, warning signs, or problems

3. MISSING DATA HANDLING: If information is missing, you MUST explicitly state what is missing:
   - "I don't have [specific missing data] for your vehicle. Could you add that information?"
   - Examples: "I don't have your service history yet" or "I need your current mileage to give accurate advice"

4. UNIT SYSTEM: All distances are in ${unitLabel}. Always use ${unitLabel} in your responses.

=== VEHICLE DATA ===
${carDetails}
${missingData.length > 0 ? `\nMISSING DATA: ${missingData.join(', ')}\n` : ''}

=== SERVICE STATUS ===
${maintenanceSummary}
${overdueServices.length > 0 ? `\n⚠️ URGENT: ${overdueServices.length} service(s) are overdue and need immediate attention.\n` : ''}
${dueSoonServices.length > 0 && overdueServices.length === 0 ? `\n⚠️ UPCOMING: ${dueSoonServices.length} service(s) are due soon.\n` : ''}

=== RESPONSE GUIDELINES ===
- Speak as a friendly mechanic, not an AI assistant
- Use simple, clear language
- Reference specific mileage numbers from the data above
- If asked about something not in the data, say: "I don't have that information. [Specify what's missing]"
- Keep responses concise and actionable
- Always use ${unitLabel} for distances
- Respond in ${language === 'en' ? 'English' : language === 'fr' ? 'French' : 'Spanish'}

Remember: You only know what's provided above. If data is missing, explicitly state what's missing rather than guessing.`;
}

export async function callLLMAPI(
  activeCar: Vehicle | null,
  userMessage: string,
  unitSystem: 'metric' | 'imperial' = 'metric',
  language: 'en' | 'fr' | 'es' = 'en',
  userName: string | null = null
): Promise<string> {
  // Backend server URL - adjust for your setup
  // For iOS Simulator/Android Emulator: http://localhost:3000
  // For physical device: Use your computer's IP address (e.g., http://192.168.2.40:3000)
  // Set EXPO_PUBLIC_BACKEND_URL environment variable to override
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.2.40:3000';

  try {
    // Allow General Mode (no car) - create fallback context
    const contextCar = activeCar || {
      make: 'General',
      model: 'Vehicle',
      year: new Date().getFullYear(), // Use current year instead of 'N/A'
      mileage: 0, // Ensure it's a number, not a string
      services: [],
    };

    // Transform vehicle data to match backend format
    // Always send an object (never null) - use contextCar for general mode
    const requestBody = {
      userMessage: userMessage.trim(),
      unitSystem: unitSystem, // Pass unit system to backend
      language: language, // Pass language preference to backend
      userName: userName, // Pass user name to backend
      activeCar: {
        make: contextCar.make,
        model: contextCar.model,
        year: contextCar.year, // Now always a number
        engine: contextCar.engine || '',
        currentMileage: contextCar.mileage || 0, // Ensure it's a number
        services: (contextCar.services || []).map((service) => ({
          type: service.type,
          mileageDone: service.mileageDone,
          intervalMiles: service.intervalMiles,
        })),
      },
    };

    // Debug: Log request body in development
    if (__DEV__) {
      console.log('[Chatbot] Sending request:', {
        hasActiveCar: !!requestBody.activeCar,
        activeCarIsNull: requestBody.activeCar === null,
        userMessageLength: requestBody.userMessage.length,
      });
    }

    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.reply || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error calling backend API:', error);
    if (error instanceof Error) {
      // Check if it's a network error (backend not running)
      if (error.message.includes('fetch') || error.message.includes('Network') || error.message.includes('Failed to connect')) {
        return `Unable to connect to the server at ${BACKEND_URL}. Please make sure:\n1. The backend server is running (npm start in server directory)\n2. Your phone and computer are on the same WiFi network\n3. Try reloading the app`;
      }
      return `Sorry, I encountered an error: ${error.message}`;
    }
    return 'Sorry, I encountered an error while processing your request. Please try again later.';
  }
}
