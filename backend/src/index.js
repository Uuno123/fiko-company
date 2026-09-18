import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import restaurantsRouter from './routes/restaurants.js'
import paymentsRouter from './routes/payments.js'

const app = express()
const PORT = process.env.PORT || 4000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({ origin: FRONTEND_URL }))
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/restaurants', restaurantsRouter)
app.use('/api/payments', paymentsRouter)

app.listen(PORT, () => {
  console.log(`[fiko-backend] http://localhost:${PORT}`)
})
