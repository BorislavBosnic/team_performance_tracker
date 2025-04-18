// netlify/functions/reset-scores.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    console.log("Function 'reset-scores' invoked.");
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed', headers: { 'Allow': 'POST', 'Access-Control-Allow-Origin': '*' }};
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const correctPassword = process.env.ADMIN_PASSWORD; // Get admin pass from env vars

    if (!supabaseUrl || !supabaseKey || !correctPassword) {
         console.error("Supabase URL/Key or Admin Password environment variables missing.");
        return { statusCode: 500, body: "Server configuration error." };
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { password } = JSON.parse(event.body);

        // **Password Check (Still basic, but done on backend)**
        if (!password || password !== correctPassword) {
             console.warn("Incorrect or missing admin password for reset attempt.");
             return { statusCode: 403, body: 'Forbidden: Incorrect password', headers: { 'Access-Control-Allow-Origin': '*' }};
        }

        // Update all players scores to 0 where the score is not already 0
        // This avoids unnecessary updates but updates all that need it.
        const { error, count } = await supabase
            .from('players')
            .update({ score: 0 })
            .neq('score', 0); // Only update rows where score IS NOT 0

        if (error) throw error;

        console.log(`Successfully reset scores for ${count || 0} players.`);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: `Scores reset for ${count || 0} players.` }),
        };

    } catch (error) {
        console.error("Error resetting scores:", error);
        return {
            statusCode: 500,
             headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to reset scores', details: error.message }),
        };
    }
};
