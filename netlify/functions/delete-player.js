// netlify/functions/delete-player.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    console.log("Function 'delete-player' invoked.");
     // Accept POST or DELETE
     if (!['POST', 'DELETE'].includes(event.httpMethod)) {
        return { statusCode: 405, body: 'Method Not Allowed', headers: { 'Allow': 'POST, DELETE', 'Access-Control-Allow-Origin': '*' }};
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

     if (!supabaseUrl || !supabaseKey) {
         console.error("Supabase URL or Service Key environment variables missing.");
        return { statusCode: 500, body: "Server configuration error." };
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Get playerId from body (if POST) or potentially query param (if DELETE - not implemented here)
        const { playerId } = JSON.parse(event.body); // Assuming POST with JSON body

        if (!playerId) {
            return { statusCode: 400, body: 'Missing playerId', headers: { 'Access-Control-Allow-Origin': '*' }};
        }

        const { error, count } = await supabase
            .from('players')
            .delete()
            .eq('id', playerId); // Match the player UUID

        if (error) throw error;

        // Check if a row was actually deleted
         if (count === 0) { // Supabase delete often returns count
             console.warn(`Player with ID ${playerId} not found for deletion.`);
             // You might choose to return 200 still, or 404
             // return { statusCode: 404, body: 'Player not found', headers: { 'Access-Control-Allow-Origin': '*' }};
         }

        console.log(`Player ${playerId} deleted (or did not exist).`);
        return {
            statusCode: 200, // Or 204 No Content if preferred
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Player deleted successfully' }),
        };

    } catch (error) {
        console.error(`Error deleting player ${event.body ? JSON.parse(event.body).playerId : 'unknown'}:`, error);
        return {
            statusCode: 500,
             headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to delete player', details: error.message }),
        };
    }
};
