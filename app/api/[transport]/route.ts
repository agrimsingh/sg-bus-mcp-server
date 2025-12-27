import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';

const LTA_API_KEY = process.env.LTA_DATAMALL_KEY || '';
const LTA_API_BASE = 'http://datamall2.mytransport.sg/ltaodataservice';

// Helper function to make LTA API requests
async function makeLtaRequest(endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${LTA_API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'AccountKey': LTA_API_KEY,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`LTA API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Helper function to calculate minutes until arrival
function getMinutesUntilArrival(estimatedArrival: string): string {
  if (!estimatedArrival) return 'N/A';
  
  const arrivalTime = new Date(estimatedArrival);
  const now = new Date();
  const diffMs = arrivalTime.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  
  if (diffMins <= 0) return 'Arriving';
  if (diffMins === 1) return '1 min';
  return `${diffMins} mins`;
}

// Helper function to format load description
function formatLoad(load: string): string {
  const loadMap: Record<string, string> = {
    'SEA': 'Seats Available',
    'SDA': 'Standing Available',
    'LSD': 'Limited Standing',
  };
  return loadMap[load] || load;
}

// Helper function to format bus type
function formatBusType(type: string): string {
  const typeMap: Record<string, string> = {
    'SD': 'Single Deck',
    'DD': 'Double Deck',
    'BD': 'Bendy',
  };
  return typeMap[type] || type;
}

// Helper function to format operator
function formatOperator(operator: string): string {
  const operatorMap: Record<string, string> = {
    'SBST': 'SBS Transit',
    'SMRT': 'SMRT Corporation',
    'TTS': 'Tower Transit Singapore',
    'GAS': 'Go Ahead Singapore',
  };
  return operatorMap[operator] || operator;
}

const handler = createMcpHandler(
  (server) => {
    // Tool 1: Get bus arrival times for a specific bus stop
    server.tool(
      'get_bus_arrivals',
      'Get real-time bus arrival times for a specific bus stop in Singapore. Returns arrival times for all bus services at that stop, or filter by a specific bus service number.',
      {
        bus_stop_code: z.string().describe('The 5-digit bus stop code (e.g., "83139", "01012")'),
        service_no: z.string().optional().describe('Optional: Filter by specific bus service number (e.g., "15", "77", "NR1")'),
      },
      async ({ bus_stop_code, service_no }) => {
        try {
          const params: Record<string, string> = { BusStopCode: bus_stop_code };
          if (service_no) params.ServiceNo = service_no;

          const data = await makeLtaRequest('BusArrivalv2', params);

          if (!data.Services || data.Services.length === 0) {
            return {
              content: [{ 
                type: 'text', 
                text: `No bus services found at bus stop ${bus_stop_code}. Please check if the bus stop code is correct.` 
              }],
            };
          }

          let result = `🚌 Bus Arrivals at Stop ${bus_stop_code}\n`;
          result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

          for (const service of data.Services) {
            result += `📍 Service ${service.ServiceNo} (${formatOperator(service.Operator)})\n`;
            
            // Next bus
            if (service.NextBus && service.NextBus.EstimatedArrival) {
              const arrival1 = getMinutesUntilArrival(service.NextBus.EstimatedArrival);
              const load1 = formatLoad(service.NextBus.Load);
              const type1 = formatBusType(service.NextBus.Type);
              result += `   1st: ${arrival1} | ${load1} | ${type1}\n`;
            }

            // Second bus
            if (service.NextBus2 && service.NextBus2.EstimatedArrival) {
              const arrival2 = getMinutesUntilArrival(service.NextBus2.EstimatedArrival);
              const load2 = formatLoad(service.NextBus2.Load);
              result += `   2nd: ${arrival2} | ${load2}\n`;
            }

            // Third bus
            if (service.NextBus3 && service.NextBus3.EstimatedArrival) {
              const arrival3 = getMinutesUntilArrival(service.NextBus3.EstimatedArrival);
              const load3 = formatLoad(service.NextBus3.Load);
              result += `   3rd: ${arrival3} | ${load3}\n`;
            }

            result += '\n';
          }

          return {
            content: [{ type: 'text', text: result }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `Error fetching bus arrivals: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }],
          };
        }
      },
    );

    // Tool 2: Get information about a specific bus service/route
    server.tool(
      'get_bus_routes',
      'Get the full route information for a specific bus service, including all bus stops along the route.',
      {
        service_no: z.string().describe('The bus service number (e.g., "15", "77", "NR1")'),
      },
      async ({ service_no }) => {
        try {
          // Fetch all bus routes (paginated API)
          let allRoutes: any[] = [];
          let skip = 0;
          
          // Fetch up to 5000 records (10 pages) to find the service
          while (skip < 5000) {
            const data = await makeLtaRequest('BusRoutes', { '$skip': skip.toString() });
            if (!data.value || data.value.length === 0) break;
            
            const serviceRoutes = data.value.filter((route: any) => 
              route.ServiceNo === service_no
            );
            allRoutes = allRoutes.concat(serviceRoutes);
            
            skip += 500;
            
            // If we found routes for this service and the next batch doesn't have more, stop
            if (allRoutes.length > 0 && serviceRoutes.length === 0) break;
          }

          if (allRoutes.length === 0) {
            return {
              content: [{ 
                type: 'text', 
                text: `No route information found for bus service ${service_no}. Please check if the service number is correct.` 
              }],
            };
          }

          // Group by direction
          const direction1 = allRoutes.filter(r => r.Direction === 1).sort((a, b) => a.StopSequence - b.StopSequence);
          const direction2 = allRoutes.filter(r => r.Direction === 2).sort((a, b) => a.StopSequence - b.StopSequence);

          let result = `🚌 Bus Service ${service_no} Route Information\n`;
          result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

          if (direction1.length > 0) {
            result += `📍 Direction 1 (${direction1.length} stops)\n`;
            result += `   From: Stop ${direction1[0].BusStopCode}\n`;
            result += `   To: Stop ${direction1[direction1.length - 1].BusStopCode}\n`;
            result += `   First Bus (Weekday): ${direction1[0].WD_FirstBus || 'N/A'}\n`;
            result += `   Last Bus (Weekday): ${direction1[0].WD_LastBus || 'N/A'}\n\n`;
          }

          if (direction2.length > 0) {
            result += `📍 Direction 2 (${direction2.length} stops)\n`;
            result += `   From: Stop ${direction2[0].BusStopCode}\n`;
            result += `   To: Stop ${direction2[direction2.length - 1].BusStopCode}\n`;
            result += `   First Bus (Weekday): ${direction2[0].WD_FirstBus || 'N/A'}\n`;
            result += `   Last Bus (Weekday): ${direction2[0].WD_LastBus || 'N/A'}\n`;
          }

          return {
            content: [{ type: 'text', text: result }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `Error fetching bus routes: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }],
          };
        }
      },
    );

    // Tool 3: Search for bus stops by name or road
    server.tool(
      'search_bus_stops',
      'Search for bus stops by name, road name, or description. Returns bus stop codes and details.',
      {
        query: z.string().describe('Search query - can be a bus stop name, road name, or landmark (e.g., "Orchard", "Tampines", "MRT")'),
      },
      async ({ query }) => {
        try {
          // Fetch all bus stops (paginated API)
          let allStops: any[] = [];
          let skip = 0;
          
          while (skip < 6000) {
            const data = await makeLtaRequest('BusStops', { '$skip': skip.toString() });
            if (!data.value || data.value.length === 0) break;
            allStops = allStops.concat(data.value);
            skip += 500;
          }

          // Search in description and road name (case-insensitive)
          const searchLower = query.toLowerCase();
          const matchingStops = allStops.filter(stop => 
            stop.Description?.toLowerCase().includes(searchLower) ||
            stop.RoadName?.toLowerCase().includes(searchLower)
          );

          if (matchingStops.length === 0) {
            return {
              content: [{ 
                type: 'text', 
                text: `No bus stops found matching "${query}". Try a different search term.` 
              }],
            };
          }

          // Limit results to first 15
          const limitedStops = matchingStops.slice(0, 15);

          let result = `🔍 Bus Stops matching "${query}"\n`;
          result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          result += `Found ${matchingStops.length} stops (showing first ${limitedStops.length})\n\n`;

          for (const stop of limitedStops) {
            result += `📍 ${stop.Description}\n`;
            result += `   Code: ${stop.BusStopCode}\n`;
            result += `   Road: ${stop.RoadName}\n\n`;
          }

          return {
            content: [{ type: 'text', text: result }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `Error searching bus stops: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }],
          };
        }
      },
    );

    // Tool 4: Get bus stop details by code
    server.tool(
      'get_bus_stop_info',
      'Get detailed information about a specific bus stop, including its name, road, and all bus services that stop there.',
      {
        bus_stop_code: z.string().describe('The 5-digit bus stop code (e.g., "83139", "01012")'),
      },
      async ({ bus_stop_code }) => {
        try {
          // Fetch bus stop details
          let allStops: any[] = [];
          let skip = 0;
          
          while (skip < 6000) {
            const data = await makeLtaRequest('BusStops', { '$skip': skip.toString() });
            if (!data.value || data.value.length === 0) break;
            allStops = allStops.concat(data.value);
            skip += 500;
          }

          const busStop = allStops.find(stop => stop.BusStopCode === bus_stop_code);

          if (!busStop) {
            return {
              content: [{ 
                type: 'text', 
                text: `Bus stop ${bus_stop_code} not found. Please check if the code is correct.` 
              }],
            };
          }

          // Get services at this stop
          const arrivalData = await makeLtaRequest('BusArrivalv2', { BusStopCode: bus_stop_code });
          const services = arrivalData.Services?.map((s: any) => s.ServiceNo).join(', ') || 'No services available';

          let result = `📍 Bus Stop Information\n`;
          result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          result += `Name: ${busStop.Description}\n`;
          result += `Code: ${busStop.BusStopCode}\n`;
          result += `Road: ${busStop.RoadName}\n`;
          result += `Location: ${busStop.Latitude}, ${busStop.Longitude}\n\n`;
          result += `🚌 Bus Services: ${services}\n`;

          return {
            content: [{ type: 'text', text: result }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: 'text', 
              text: `Error fetching bus stop info: ${error instanceof Error ? error.message : 'Unknown error'}` 
            }],
          };
        }
      },
    );
  },
  {},
  { 
    basePath: '/api',
    verboseLogs: true,
  },
);

export { handler as GET, handler as POST };
