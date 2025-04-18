// netlify/functions/add-player.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    console.log("Function 'add-player' invoked.");
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed', headers: { 'Allow': 'POST', 'Access-Control-Allow-Origin': '*' }};
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
         console.error("Supabase URL or Service Key environment variables missing.");
        return { statusCode: 500, body: "Server configuration error." };
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { name, avatarUrl } = JSON.parse(event.body);

        if (!name || !name.trim() || !avatarUrl || !avatarUrl.trim()) {
             return { statusCode: 400, body: 'Missing or invalid name or avatarUrl', headers: { 'Access-Control-Allow-Origin': '*' }};
        }

        // Prepare data using Supabase column names
        const playerData = {
            name: name.trim(),
            avatar_url: avatarUrl.trim(), // Ensure column name matches Supabase table
            score: 0 // Initialize score
        };

        const { data, error } = await supabase
            .from('players')
            .insert([playerData])
            .select() // Select the newly inserted row(s)
            .single(); // Expecting only one row back

        if (error) throw error;

        console.log("Player added successfully:", data.id);
        return {
            statusCode: 201, // 201 Created
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(data), // Return the newly created player object
        };

    } catch (error) {
        console.error("Error adding player:", error);
         // Check for potential unique constraint errors if names should be unique (not implemented here)
         // if (error.code === '23505') { // Example: PostgreSQL unique violation code
         //     return { statusCode: 409, body: 'Player name might already exist.' };
         // }
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to add player', details: error.message }),
        };
    }
};  
