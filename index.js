require("dotenv").config();
const express = require("express");
const route = express();
const {
  getUsers,
  loginUser,
  getRegs,
  getProvs,
  getCits,
  insertNewUser,
  sOTP,
  vOTP,
  getBrgys,
  sInsert,
  jwtVerify,
  cMeet,
  gAccessKey,
  iHost,
  hostLook,
  iDoctor,
  doctorsInHost,
  gPromos,
  iPromo,
  getPHost,
  iSocketID,
  gPatientInAroom,
  cancelPatient,
  iPrescription,
  getResidents,
  gResidents,
  gMedicines,
  gfMedicines,
  iMedicine,
  fMedicine,
  fUser,
  fPromo,
  payment,
  gMeetingDetails,
  eMeeting,
  iLGU,
  iDrugstore,
  iPatient,
  logUser,
  createHost,
  fHost,
  fPatientHost,
  pPatientInQueue,
  nInQueue,
  fMeetingDetails,
  verifyToken,
  gPrescription,
  gPromo,
  iOrder,
  gOrder,
  gPromoDetails,
} = require("./controller/controller");
const cors = require("cors");
const https = require("https");
const fs = require("fs");

const options = {
  key: fs.readFileSync("./helpadvocatesph_tech.pem"),
  cert: fs.readFileSync("./helpadvocatesph_tech.crt"),
  ca: fs.readFileSync("./helpadvocatesph_tech.ca-bundle"),
  passphrase: PASSPHRASE,
};

const server = https.createServer(options, route);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("join", async (data) => {
    socket.join(socket.id);
    io.to(socket.id).emit("invited", { socketID: socket.id });
  });
  socket.on("nextPatient", async (data) => {
    let response = await nInQueue(data.hostID);
    if (!response.Messages?.length) socket.emit("patientNone");
    else {
      io.to(response.Messages[0].MessageAttributes.socketID.StringValue).emit(
        "patientInvite",
        {
          ...JSON.parse(response.Messages[0].Body),
          ...response.Messages[0].MessageAttributes,
          ReceiptHandle: response.Messages[0].ReceiptHandle,
          doctorsID: socket.id,
        }
      );
    }
  });
  socket.on("patientCancelled", async (data) => {
    let a = await cancelPatient(data.id);
  });
  socket.on("patientAccepted", (data) => {
    let { token, ...rest } = data;
    let decoded = verifyToken(token);
    io.to(data.doctorsID).emit("patientJoined", {
      ...rest,
      patientID: decoded.id,
    });
  });
  socket.on("joinDrugstore", (data) => {
    socket.join("drugstore");
    console.log("added");
  });
  socket.on("listenPatientRequest", async (data) => {
    let info = await fUser(data.token);
    socket.join(socket.id);
    io.to("drugstore").emit("patientRequests", {
      patient: { ...info[0] },
      requestID: data.requestID,
      request: data.request,
      patientSocketID: socket.id,
      isConfirm: "confirming",
    });
    socket.emit("requested", {});
  });
  socket.on("turnover", async (data) => {
    console.log(data);
    let info = await fUser(data.token);
    io.to(data.patientSocketID).emit("drugstoreResponse", {
      patient: data.patient,
      status: "confirm",
      request: data.request,
      durgstoreSocketID: socket.id,
      drugstore: info,
      requestID: data.requestID,
    });
  });
  socket.on("checkout", (data) => {
    console.log(data);
    io.to(data.durgstoreSocketID).emit("listenPatientConfirmation", {
      ...data,
      status: "paid",
    });
  });
});

route.use(
  cors({
    origin: "*",
  })
);

route.use(express.urlencoded({ extended: false }));
route.use(express.json());

route.get("/regions", getRegs);
route.post("/provinces", getProvs);
route.post("/cities", getCits);
route.post("/barangays", getBrgys);
route.post("/adduser", insertNewUser);
route.post("/sendOTP", sOTP);
route.post("/verifyOTP", vOTP);
route.post("/verify", jwtVerify);
route.post("/createRoom", cMeet);
route.post("/getAK", gAccessKey);
route.post("/hostLook", hostLook);
route.post("/getDoctorsInHost", doctorsInHost);
route.post("/getPatientHost", getPHost);
route.post("/getResidents", getResidents);
route.post("/getSolelyResidents", gResidents);
route.post("/getMedicines", gMedicines);
route.post("/getFirstMedicines", gfMedicines);
route.post("/insertMedicine", iMedicine);
route.post("/findMedicine", fMedicine);
route.post("/pay", payment);

// NEW

route.post("/getMeetingDetails", gMeetingDetails);
route.post("/endMeeting", eMeeting);
route.post("/insertLGU", iLGU);
route.post("/insertDrugstore", iDrugstore);
route.post("/insertPatient", iPatient);
route.post("/auth", logUser);
route.post("/createHost", createHost);
route.post("/findHost", fHost);
route.post("/insertDoctor", iDoctor);
route.post("/findPatientHost", fPatientHost);
route.post("/putPatientInQueue", pPatientInQueue);
route.post("/findMeetingDetailsByHostID", fMeetingDetails);
route.post("/insertPrescription", iPrescription);
route.post("/getPrescription", gPrescription);
route.post("/findPromo", gPromo);
route.post("/insertOrder", iOrder);
route.post("/getOrders", gOrder);
route.post("/insertPromo", iPromo);
route.post("/getPromo", gPromoDetails);

server.listen(8080, () => console.log("Listening..."));
