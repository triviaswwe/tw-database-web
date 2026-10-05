import pool from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [reigns] = await pool.query(`
      SELECT 
          COALESCE(rm.wrestler_id, cr.wrestler_id) AS wrestler_id, 
          w.wrestler AS wrestler_name, 
          w.image_url AS wrestler_image,
          c.id AS championship_id, 
          c.title_name, 
          c.type AS title_type,
          COALESCE(rm.start_date, cr.won_date) AS won_date,
          ct.image_url AS title_image
      FROM championship_reigns cr
      LEFT JOIN reign_members rm ON cr.id = rm.reign_id
      JOIN wrestlers w ON w.id = COALESCE(rm.wrestler_id, cr.wrestler_id)
      JOIN championships c ON cr.championship_id = c.id
      LEFT JOIN championship_titles ct ON c.id = ct.championship_id 
          AND COALESCE(rm.start_date, cr.won_date) >= ct.start_date 
          AND (COALESCE(rm.start_date, cr.won_date) <= ct.end_date OR ct.end_date IS NULL)
      WHERE c.type IS NOT NULL
      ORDER BY COALESCE(rm.start_date, cr.won_date) ASC
    `);

    const [activeTitlesRows] = await pool.query(`
      SELECT c.id AS championship_id, c.type AS title_type, c.title_name, ct.image_url AS title_image
      FROM championships c
      LEFT JOIN championship_titles ct ON c.id = ct.championship_id AND ct.end_date IS NULL
      WHERE c.type IS NOT NULL
    `);

    const activeMap = {
      main: activeTitlesRows.filter(t => t.title_type === 'main'),
      mid: activeTitlesRows.filter(t => t.title_type === 'mid'),
      ic: activeTitlesRows.filter(t => t.title_type === 'mid' && t.title_name.toLowerCase().includes('intercontinental')),
      us: activeTitlesRows.filter(t => t.title_type === 'mid' && t.title_name.toLowerCase().includes('united states')),
      tag: activeTitlesRows.filter(t => t.title_type === 'tag')
    };

    // Group by wrestler
    const wrestlerMap = new Map();

    for (const row of reigns) {
      if (!wrestlerMap.has(row.wrestler_id)) {
        wrestlerMap.set(row.wrestler_id, {
          id: row.wrestler_id,
          name: row.wrestler_name,
          image: row.wrestler_image,
          reigns: []
        });
      }
      wrestlerMap.get(row.wrestler_id).reigns.push(row);
    }

    const tripleCrowns = [];
    const grandSlams = [];
    const potentialTripleCrowns = [];
    const potentialGrandSlams = [];

    for (const wrestler of wrestlerMap.values()) {
      let mainTitles = [];
      let midTitles = [];
      let tagTitles = [];
      
      // We process reigns in chronological order
      let tcCount = 0;
      let gsCount = 0;
      
      const usedForTC = new Set();
      const usedForGS = new Set();
      
      const currentCycle = {
        main: null,
        mid_ic: null,
        mid_us: null,
        tag: null
      };

      // To properly handle multiple Grand Slams / Triple crowns (Doble, Triple),
      // we can group reigns into cycles.
      
      // Let's implement a simpler approach: 
      // Collect all valid distinct titles the wrestler has won.
      // Actually, the rules say "si logra dar una segunda vuelta completa... toma el segundo título ganado"
      
      const categorizedReigns = {
        main: [],
        mid: [],
        tag: []
      };
      
      for (const r of wrestler.reigns) {
        if (r.title_type === 'main') categorizedReigns.main.push(r);
        else if (r.title_type === 'mid') categorizedReigns.mid.push(r);
        else if (r.title_type === 'tag') categorizedReigns.tag.push(r);
      }
      
      // Group mid titles into IC and US based on name
      const icReigns = categorizedReigns.mid.filter(r => r.title_name.toLowerCase().includes('intercontinental'));
      const usReigns = categorizedReigns.mid.filter(r => r.title_name.toLowerCase().includes('united states'));
      // If there are mid titles that don't match, they won't count for GS, but any mid counts for TC.
      
      let maxCycles = Math.max(categorizedReigns.main.length, categorizedReigns.mid.length, categorizedReigns.tag.length);
      
      for (let i = 0; i < maxCycles; i++) {
        const main = categorizedReigns.main[i];
        const tag = categorizedReigns.tag[i];
        const midAny = categorizedReigns.mid[i];
        
        const ic = icReigns[i];
        const us = usReigns[i];
        
        // Triple Crown Check
        if (main && midAny && tag) {
          tcCount++;
          // Date when achieved is the max of the three won_dates
          const dates = [new Date(main.won_date), new Date(midAny.won_date), new Date(tag.won_date)];
          const achievedDate = new Date(Math.max(...dates));
          
          tripleCrowns.push({
            wrestlerId: wrestler.id,
            wrestlerName: wrestler.name,
            wrestlerImage: wrestler.image,
            times: i + 1,
            achievedDate: achievedDate.toISOString().split('T')[0],
            titles: [main, midAny, tag].sort((a, b) => new Date(a.won_date) - new Date(b.won_date))
          });
        } else if (i === tcCount) {
          // Potential Triple Crown: Missing exactly 1
          const hasMain = !!main;
          const hasMid = !!midAny;
          const hasTag = !!tag;
          
          if (hasMain + hasMid + hasTag === 2) {
            const missing = !hasMain ? 'main' : (!hasMid ? 'mid' : 'tag');
            potentialTripleCrowns.push({
              wrestlerId: wrestler.id,
              wrestlerName: wrestler.name,
              wrestlerImage: wrestler.image,
              missing,
              times: i + 1,
              missingTitle: activeMap[missing],
              titles: [main, midAny, tag].filter(Boolean)
            });
          }
        }
        
        // Grand Slam Check
        if (main && ic && us && tag) {
          gsCount++;
          const dates = [new Date(main.won_date), new Date(ic.won_date), new Date(us.won_date), new Date(tag.won_date)];
          const achievedDate = new Date(Math.max(...dates));
          
          grandSlams.push({
            wrestlerId: wrestler.id,
            wrestlerName: wrestler.name,
            wrestlerImage: wrestler.image,
            times: i + 1,
            achievedDate: achievedDate.toISOString().split('T')[0],
            titles: [main, ic, us, tag].sort((a, b) => new Date(a.won_date) - new Date(b.won_date))
          });
        } else if (i === gsCount) {
           // Potential Grand Slam: Missing exactly 1
           const hasMain = !!main;
           const hasIc = !!ic;
           const hasUs = !!us;
           const hasTag = !!tag;
           
           if (hasMain + hasIc + hasUs + hasTag === 3) {
             const missing = !hasMain ? 'main' : (!hasIc ? 'ic' : (!hasUs ? 'us' : 'tag'));
             potentialGrandSlams.push({
               wrestlerId: wrestler.id,
               wrestlerName: wrestler.name,
               wrestlerImage: wrestler.image,
               missing,
               times: i + 1,
               missingTitle: activeMap[missing],
               titles: [main, ic, us, tag].filter(Boolean)
             });
           }
        }
      }
    }

    res.status(200).json({
      tripleCrowns: tripleCrowns.sort((a, b) => new Date(a.achievedDate) - new Date(b.achievedDate)),
      grandSlams: grandSlams.sort((a, b) => new Date(a.achievedDate) - new Date(b.achievedDate)),
      potentialTripleCrowns,
      potentialGrandSlams
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ error: 'Database error' });
  }
}
