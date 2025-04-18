// netlify/functions/update-score.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    console.log("Function 'update-score' invoked.");
     // Accept POST or PUT/PATCH
     if (!['POST', 'PUT', 'PATCH'].includes(event.httpMethod)) {
        return { statusCode: 405, body: 'Method Not Allowed', headers: { 'Allow': 'POST, PUT, PATCH', 'Access-Control-Allow-Origin': '*' }};
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

     if (!supabaseUrl || !supabaseKey) {
         console.error("Supabase URL or Service Key environment variables missing.");
        return { statusCode: 500, body: "Server configuration error." };
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { playerId, newScore } = JSON.parse(event.body);

        if (!playerId || typeof newScore !== 'number' || newScore < 0) {
            return { statusCode: 400, body: 'Missing or invalid playerId or non-negative newScore required', headers: { 'Access-Control-Allow-Origin': '*' }};
        }

        const scoreToUpdate = Math.floor(newScore); // Ensure it's an integer

        const { data, error, count } = await supabase
            .from('players')
            .update({ score: scoreToUpdate })
            .eq('id', playerId) // Match the player UUID
            .select() // Select the updated row
            .single();

        if (error) throw error;

        // Check if a row was actually updated (count might be available depending on client version/settings)
        // Or check if data exists after the update
        if (!data) {
             console.warn(`Player with ID ${playerId} not found for update.`);
             return { statusCode: 404, body: 'Player not found', headers: { 'Access-Control-Allow-Origin': '*' }};
        }

        console.log(`Score updated successfully for player ${playerId}`);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(data), // Return the updated player object
        };

    } catch (error) {
        console.error(`Error updating score for ${event.body ? JSON.parse(event.body).playerId : 'unknown'}:`, error);
        return {
            statusCode: 500,
             headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to update score', details: error.message }),
        };
    }
};
