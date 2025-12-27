import { NextRequest } from 'next/server';

const ARRIVELAH_API = 'https://arrivelah2.busrouter.sg';

// Helper functions
function getMinutesUntilArrival(timeString: string): string {
  if (!timeString) return 'N/A';
  const arrivalTime = new Date(timeString);
  const now = new Date();
  const diffMs = arrivalTime.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins <= 0) return 'Arriving';
  if (diffMins === 1) return '1 min';
  return `${diffMins} mins`;
}

function formatLoad(load: string): string {
  const loadMap: Record<string, string> = { 'SEA': 'Seats Available', 'SDA': 'Standing Available', 'LSD': 'Limited Standing' };
  return loadMap[load] || load || 'Unknown';
}

function formatBusType(type: string): string {
  const typeMap: Record<string, string> = { 'SD': 'Single Deck', 'DD': 'Double Deck', 'BD': 'Bendy' };
  return typeMap[type] || type || 'Unknown';
}

function formatOperator(operator: string): string {
  const operatorMap: Record<string, string> = { 'SBST': 'SBS Transit', 'SMRT': 'SMRT Corporation', 'TTS': 'Tower Transit', 'GAS': 'Go Ahead' };
  return operatorMap[operator] || operator || 'Unknown';
}

// Bus stop data (cached from arrivelah)
let busStopsCache: any[] | null = null;
let busStopsCacheTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function getBusStops(): Promise<any[]> {
  const now = Date.now();
  if (busStopsCache && (now - busStopsCacheTime) < CACHE_DURATION) {
    return busStopsCache;
  }
  
  try {
    const response = await fetch('https://raw.githubusercontent.com/cheeaun/busrouter-sg/master/data/3/stops.json');
    if (response.ok) {
      const data = await response.json();
      // Convert object to array format
      busStopsCache = Object.entries(data).map(([code, stop]: [string, any]) => ({
        BusStopCode: code,
        Description: stop[2] || '',
        RoadName: stop[3] || '',
        Latitude: stop[0],
        Longitude: stop[1]
      }));
      busStopsCacheTime = now;
      return busStopsCache;
    }
  } catch (error) {
    console.error('Failed to fetch bus stops:', error);
  }
  return busStopsCache || [];
}

// Tool implementations
async function getBusArrivals(busStopCode: string, serviceNo?: string) {
  try {
    const response = await fetch(`${ARRIVELAH_API}/?id=${busStopCode}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.services || data.services.length === 0) {
      return `No bus services found at bus stop ${busStopCode}. Please check if the bus stop code is correct.`;
    }

    let services = data.services;
    if (serviceNo) {
      services = services.filter((s: any) => s.no === serviceNo);
      if (services.length === 0) {
        return `Bus service ${serviceNo} not found at stop ${busStopCode}.`;
      }
    }

    let result = `🚌 Bus Arrivals at Stop ${busStopCode}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    for (const service of services) {
      result += `📍 Service ${service.no} (${formatOperator(service.operator)})\n`;
      
      if (service.next?.time) {
        result += `   1st: ${getMinutesUntilArrival(service.next.time)} | ${formatLoad(service.next.load)} | ${formatBusType(service.next.type)}\n`;
      }
      if (service.next2?.time) {
        result += `   2nd: ${getMinutesUntilArrival(service.next2.time)} | ${formatLoad(service.next2.load)}\n`;
      }
      if (service.next3?.time) {
        result += `   3rd: ${getMinutesUntilArrival(service.next3.time)} | ${formatLoad(service.next3.load)}\n`;
      }
      result += '\n';
    }
    
    return result;
  } catch (error) {
    return `Error fetching bus arrivals: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

async function searchBusStops(query: string) {
  try {
    const stops = await getBusStops();
    const searchLower = query.toLowerCase();
    
    const matchingStops = stops.filter(stop =>
      stop.Description?.toLowerCase().includes(searchLower) ||
      stop.RoadName?.toLowerCase().includes(searchLower) ||
      stop.BusStopCode?.includes(query)
    );

    if (matchingStops.length === 0) {
      return `No bus stops found matching "${query}". Try a different search term.`;
    }

    const limitedStops = matchingStops.slice(0, 15);
    let result = `🔍 Bus Stops matching "${query}"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nFound ${matchingStops.length} stops (showing first ${limitedStops.length})\n\n`;
    
    for (const stop of limitedStops) {
      result += `📍 ${stop.Description}\n   Code: ${stop.BusStopCode}\n   Road: ${stop.RoadName}\n\n`;
    }
    
    return result;
  } catch (error) {
    return `Error searching bus stops: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

async function getBusStopInfo(busStopCode: string) {
  try {
    const stops = await getBusStops();
    const busStop = stops.find(stop => stop.BusStopCode === busStopCode);
    
    if (!busStop) {
      return `Bus stop ${busStopCode} not found. Please check if the code is correct.`;
    }

    // Get services at this stop
    const arrivalResponse = await fetch(`${ARRIVELAH_API}/?id=${busStopCode}`);
    let services = 'Unable to fetch services';
    
    if (arrivalResponse.ok) {
      const arrivalData = await arrivalResponse.json();
      services = arrivalData.services?.map((s: any) => s.no).join(', ') || 'No services available';
    }

    return `📍 Bus Stop Information\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nName: ${busStop.Description}\nCode: ${busStop.BusStopCode}\nRoad: ${busStop.RoadName}\nLocation: ${busStop.Latitude}, ${busStop.Longitude}\n\n🚌 Bus Services: ${services}`;
  } catch (error) {
    return `Error fetching bus stop info: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// MCP Tools definition
const tools = [
  {
    name: 'get_bus_arrivals',
    description: 'Get real-time bus arrival times for a specific bus stop in Singapore. Returns arrival times for all bus services at that stop, or filter by a specific bus service number.',
    inputSchema: {
      type: 'object',
      properties: {
        bus_stop_code: { type: 'string', description: 'The 5-digit bus stop code (e.g., "83139", "01012")' },
        service_no: { type: 'string', description: 'Optional: Filter by specific bus service number (e.g., "15", "77", "NR1")' }
      },
      required: ['bus_stop_code']
    }
  },
  {
    name: 'search_bus_stops',
    description: 'Search for bus stops by name, road name, or description. Returns bus stop codes and details.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query - can be a bus stop name, road name, or landmark (e.g., "Orchard", "Tampines", "MRT")' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_bus_stop_info',
    description: 'Get detailed information about a specific bus stop, including its name, road, and all bus services that stop there.',
    inputSchema: {
      type: 'object',
      properties: {
        bus_stop_code: { type: 'string', description: 'The 5-digit bus stop code (e.g., "83139", "01012")' }
      },
      required: ['bus_stop_code']
    }
  }
];

// Handle tool calls
async function handleToolCall(name: string, args: any): Promise<string> {
  switch (name) {
    case 'get_bus_arrivals':
      return await getBusArrivals(args.bus_stop_code, args.service_no);
    case 'search_bus_stops':
      return await searchBusStops(args.query);
    case 'get_bus_stop_info':
      return await getBusStopInfo(args.bus_stop_code);
    default:
      return `Unknown tool: ${name}`;
  }
}

// Handle MCP JSON-RPC messages
async function handleMessage(message: any): Promise<any> {
  const { method, id, params } = message;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'sg-bus-mcp', version: '1.0.0' }
        }
      };

    case 'initialized':
      return null;

    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: { tools }
      };

    case 'tools/call':
      try {
        const result = await handleToolCall(params.name, params.arguments || {});
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: result }]
          }
        };
      } catch (error) {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32000,
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        };
      }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      };
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET - Establish SSE connection
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const baseUrl = request.url.split('?')[0];
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${baseUrl}\n\n`));
      controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);
      
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// POST - Handle MCP messages
export async function POST(request: NextRequest) {
  try {
    const message = await request.json();
    const response = await handleMessage(message);
    
    if (response) {
      return new Response(JSON.stringify(response), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error processing message:', error);
    return new Response(JSON.stringify({ 
      jsonrpc: '2.0',
      error: { code: -32000, message: error instanceof Error ? error.message : 'Failed to process message' },
      id: null
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
