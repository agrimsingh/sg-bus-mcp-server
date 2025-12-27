export default function Home() {
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🚌 Singapore Bus MCP Server</h1>
      
      <p className="text-lg mb-6">
        This is a Model Context Protocol (MCP) server that provides real-time Singapore bus information 
        using the LTA DataMall API.
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Available Tools</h2>
        
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg">get_bus_arrivals</h3>
            <p className="text-gray-600">Get real-time bus arrival times for a specific bus stop</p>
            <p className="text-sm mt-2">
              <strong>Parameters:</strong> bus_stop_code (required), service_no (optional)
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg">get_bus_routes</h3>
            <p className="text-gray-600">Get the full route information for a specific bus service</p>
            <p className="text-sm mt-2">
              <strong>Parameters:</strong> service_no (required)
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg">search_bus_stops</h3>
            <p className="text-gray-600">Search for bus stops by name, road name, or landmark</p>
            <p className="text-sm mt-2">
              <strong>Parameters:</strong> query (required)
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg">get_bus_stop_info</h3>
            <p className="text-gray-600">Get detailed information about a specific bus stop</p>
            <p className="text-sm mt-2">
              <strong>Parameters:</strong> bus_stop_code (required)
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Connect to this MCP Server</h2>
        
        <p className="mb-4">Add this to your MCP client configuration:</p>
        
        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
{`{
  "mcpServers": {
    "sg-bus": {
      "url": "https://your-deployment-url.vercel.app/api/mcp"
    }
  }
}`}
        </pre>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Data Source</h2>
        <p>
          Bus data is provided by the{' '}
          <a href="https://datamall.lta.gov.sg/" className="text-blue-600 hover:underline">
            LTA DataMall API
          </a>
          .
        </p>
      </section>
    </main>
  );
}
