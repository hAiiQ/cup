import type { NextApiRequest, NextApiResponse } from 'next'

const HENRIKDEV_API_BASE = 'https://api.henrik.dev/valorant/v1'

const normalizeRank = (rank: unknown): string | null => {
  if (typeof rank === 'string' && rank.trim().length > 0) {
    return rank.trim()
  }
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const name = Array.isArray(req.query.name) ? req.query.name[0] : req.query.name
  const tag = Array.isArray(req.query.tag) ? req.query.tag[0] : req.query.tag

  if (!name || !tag || typeof name !== 'string' || typeof tag !== 'string') {
    res.status(400).json({ error: 'Name and tag are required' })
    return
  }

  try {
    const response = await fetch(`${HENRIKDEV_API_BASE}/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`)

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Valorant rank lookup failed:', response.status, errorBody)
      res.status(response.status).json({ error: 'Rank lookup failed' })
      return
    }

    const body = await response.json()
    const tier = normalizeRank(body?.data?.currenttierpatched || body?.data?.currenttier || body?.currenttierpatched || body?.currenttier)

    if (!tier) {
      console.error('Valorant rank lookup returned no tier:', body)
      res.status(404).json({ error: 'Rank not found' })
      return
    }

    res.status(200).json({ rank: tier, name, tag })
  } catch (error) {
    console.error('Valorant rank lookup error:', error)
    res.status(500).json({ error: 'Unable to fetch rank' })
  }
}
