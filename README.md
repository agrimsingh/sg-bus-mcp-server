# Singapore Bus MCP Server

A Model Context Protocol (MCP) server that provides real-time Singapore bus information using the LTA DataMall API.

## Features

This MCP server exposes 4 tools:

| Tool | Description |
|------|-------------|
| `get_bus_arrivals` | Get real-time bus arrival times for a specific bus stop |
| `get_bus_routes` | Get the full route information for a specific bus service |
| `search_bus_stops` | Search for bus stops by name, road name, or landmark |
| `get_bus_stop_info` | Get detailed information about a specific bus stop |

## Deployment to Vercel

### Option 1: Deploy via GitHub (Recommended)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/sg-bus-mcp-server.git
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Add the environment variable:
     - Name: `LTA_DATAMALL_KEY`
     - Value: Your LTA DataMall API key
   - Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Add environment variable:**
   ```bash
   vercel env add LTA_DATAMALL_KEY
   ```

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API key
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Test with MCP Inspector:**
   ```bash
   npx @modelcontextprotocol/inspector@latest http://localhost:3000
   ```

## Connecting to Your MCP Server

After deployment, add this to your MCP client configuration (e.g., Claude Desktop, Cursor):

```json
{
  "mcpServers": {
    "sg-bus": {
      "url": "https://your-deployment-url.vercel.app/api/mcp"
    }
  }
}
```

## Example Usage

Once connected, you can ask your AI assistant questions like:

- "What buses are arriving at bus stop 83139?"
- "Search for bus stops near Orchard"
- "What's the route for bus 15?"
- "Tell me about bus stop 01012"

## Data Source

Bus data is provided by the [LTA DataMall API](https://datamall.lta.gov.sg/).

## License

MIT
