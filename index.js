const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const { createCanvas, loadImage } = require('canvas');
const multer = require('multer');
const upload = multer();
const moment = require('moment');
const mongoose = require('mongoose');
const QRCode = require('qrcode');

const mongoDB = 'mongodb://127.0.0.1/passprt_development';

mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log("Connected to Database!");
});

const Schema = mongoose.Schema;

const TicketSchema = new Schema({
  bookingId: { type: String, required: true },
  experienceName: { type: String, required: true },
  eventDate: { type: Date, required: true },
  numberOfPeople: { type: Number, required: true },
  customerName: { type: String, required: true }
});


const Ticket = mongoose.model('Ticket', TicketSchema);

const app = express();
const port = 7001;

const cors = require('cors');

app.use(cors({
    origin: 'http://localhost:7001',  // application origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  }));
  

app.use(express.static('public'));

app.use(expressLayouts);

app.set('view engine', 'ejs');

app.set('views', './views');

app.use(express.urlencoded({ extended: true }));

app.get('/', (req,res) => {

    res.render('layout', {});
});

app.use(express.json());

function generateCustomId() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charactersLength = characters.length;
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    result += Math.floor(Math.random() * 10); 
    return result;
}; 

app.post('/generate-ticket', upload.none(), async (req, res) => {

    console.log(req.body);

    const bookingId = generateCustomId();

    try {
        const width = 500; 
        const height = 1000; 
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        const backgroundImage = await loadImage('public/ticket-template.jpg'); 
        ctx.drawImage(backgroundImage, 0, 0, width, height);

        ctx.fillStyle = '#FFFFFF'; // White color
        ctx.font = '20px Arial';
        ctx.fillText(`${bookingId}`, 127, 40);

        // Reset text color to black for other details
        ctx.fillStyle = '#000';
        ctx.fillText(`${req.body.experienceName}`, 50, 300);
        const eventDate = moment(req.body['start-datetime'], 'MMM D, YYYY h:mm A').format('MMMM D, YYYY h:mm A');
        ctx.fillText(`${eventDate}`, 50, 400);
        ctx.fillText(`${req.body.numberOfPeople}`, 400, 500);
        ctx.fillText(`${req.body.customerName}`, 50, 500);

        const qrCodeData = `http://localhost:7001/ticket/${bookingId}`; // process.env.DB + `/${bookingId}`
        const qrCode = await QRCode.toDataURL(qrCodeData);

        const qrImage = await loadImage(qrCode);
        const qrX = 170; 
        const qrY = 645; 
        const qrSize = 150; 
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        ctx.fillText(`Booking ID: ${bookingId}`, 160, 800);

        
        const buffer = canvas.toBuffer('image/png');

        const filename = `ticket-${bookingId}.png`;

        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        
        res.send(buffer);
    } catch (error) {
        console.error('Error generating ticket image:', error);
        res.status(500).send('Error generating ticket image');
    }

    const newTicket = new Ticket({
        bookingId: bookingId,
        experienceName: req.body.experienceName,
        eventDate: moment(req.body['start-datetime'], 'MMM D, YYYY h:mm A').toDate(),
        numberOfPeople: req.body.numberOfPeople,
        customerName: req.body.customerName
      });
    
    
      try {
        newTicket.save();
      } catch (error) {
        console.log('Error in saving document in DB:', error);
      } finally{
        console.log(`Saved: ${newTicket}`);
      }
});


app.get('/ticket/:id', async function(req, res) {
    let bookingId = req.params.id;

    try {
        
        const ticket = await Ticket.findOne({ bookingId: bookingId });

        
        if (!ticket) {
            return res.status(404).send('Ticket not found');
        }

        
        const width = 500; 
        const height = 1000;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        const backgroundImage = await loadImage('public/ticket-template.jpg');
        ctx.drawImage(backgroundImage, 0, 0, width, height);

        ctx.fillStyle = '#FFFFFF'; // White color
        ctx.font = '20px Arial';
        ctx.fillText(`${bookingId}`, 127, 40);

        // Reset text color to black for other details
        ctx.fillStyle = '#000';
        ctx.fillText(ticket.experienceName, 50, 300);
        const eventDate = moment(ticket.eventDate).format('MMMM D, YYYY h:mm A');
        ctx.fillText(eventDate, 50, 400);
        ctx.fillText(ticket.numberOfPeople.toString(), 400, 500);
        ctx.fillText(ticket.customerName, 50, 500);

        const qrCodeData = `http://localhost:7001/ticket/${bookingId}`; // process.env.DB + `/${bookingId}`
        const qrCode = await QRCode.toDataURL(qrCodeData);

        const qrImage = await loadImage(qrCode);
        const qrX = 170; 
        const qrY = 645; 
        const qrSize = 150; 
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        ctx.fillText(`Booking ID: ${ticket.bookingId}`, 160, 800);

        const buffer = canvas.toBuffer('image/png');

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.bookingId}.png"`);

        res.send(buffer);

    } catch (error) {
        console.error('Error retrieving ticket:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.listen(port, function (err) {

    if (err) console.log(`Error in running the server: ${err}`);

    console.log(`Server is up and running on port: ${port}`);
});

// ~/Downloads/
// 
