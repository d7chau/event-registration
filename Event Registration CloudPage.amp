%%[

/*SET PAGE VARIABLES*/
SET @expiryDate = '2025-05-30'
SET @systemDate = Now(1)
SET @localDate = SystemDateToLocalDate(@systemDate)
SET @errorCode = '0'

/* CHECK EXPIRY DATE */
IF @localDate < @expiryDate THEN
 SET @hasExpired = 'FALSE'

 /* RETREIVE FORM PARAMETERS */
 SET @firstName = RequestParameter('firstName')
 SET @lastName = RequestParameter('lastName')
 SET @email = RequestParameter('email')
 SET @workshop = RequestParameter('workshop')
 SET @consent = RequestParameter('consent')
 SET @action = RequestParameter('action')

 /* CHECK ACTION */
 IF @action == 'submit' THEN
   /* REQUIRED PARAMETERS ARE VALID */
   IF NOT EMPTY(@firstName) AND NOT EMPTY(@lastName) AND NOT EMPTY(@email) AND NOT EMPTY(@workshop) AND NOT EMPTY(@consent) THEN

     /* CHECK IF ALREADY SUBMITTED */
     SET @rows = LookupRows("EventRegistrationDE", "Email", @email)
     SET @rowCount = rowcount(@rows)
     IF @rowCount == 0 THEN

      /* API CREDENTIALS */
      SET @enc_ClientID = Lookup("Enc_API_Credentials", "Client_Id", "Package_Name", "API Test Playground")
      SET @enc_ClientSecret = Lookup("Enc_API_Credentials", "Client_Secret", "Package_Name", "API Test Playground")
      SET @auth_URL = Lookup("Enc_API_Credentials", "Auth_Base_URI", "Package_Name", "API Test Playground")
      SET @rest_URL = Lookup("Enc_API_Credentials", "REST_Base_URI", "Package_Name", "API Test Playground")

      /* SET SFMC KEYS */
      SET @sym = "35cffd94-38c3-4b58-a57d-1080f9785ca6"
      SET @IV = "1afc056b-9f6b-4e6c-b76b-d1d851c52d64"
      SET @salt="5c797c66-7b62-4071-88eb-e530b2a415a3"

      /* DECRYPT CREDENTIALS */
      SET @dec_ClientID = DecryptSymmetric(@enc_ClientID, 'AES', @sym, @null, @salt, @null, @IV, @null)
      SET @dec_Client_Secret = DecryptSymmetric(@enc_ClientSecret, 'AES', @sym, @null, @salt, @null, @IV, @null)

]%%
<script runat="server">
  Platform.Load('Core','1');
  try {
    var dec_ClientID = Variable.GetValue("@dec_ClientID");
    var dec_Client_Secret = Variable.GetValue("@dec_Client_Secret");
    var auth_URL = Variable.GetValue("@auth_URL");
    var rest_URL = Variable.GetValue("@rest_URL");
    var errorCode = '0';

    /* RETRIEVE FORM DATA */
    var firstName = Variable.GetValue("@firstName");
    var lastName = Variable.GetValue("@lastName");
    var email = Variable.GetValue("@email");
    var workshop = Variable.GetValue("@workshop");
    var consent = Variable.GetValue("@consent");
    var localDate = Variable.GetValue("@localDate");
    var fullName = firstName + ' ' + lastName;
    var logID = Platform.Function.GUID();

    /* RETRIEVE TOKEN */
    var url = auth_URL + "/v2/token";
    var contentType = "application/json";
    var payload = '{"grant_type": "client_credentials","client_id": "' + dec_ClientID + '","client_secret": "' + dec_Client_Secret + '"}';
    var headerNames = [];
    var headerValues = [];
    var result = HTTP.Post(url, contentType, payload, headerNames, headerValues);
    var responseJSON = Platform.Function.ParseJSON(result.Response[0]);
    var apiToken = responseJSON.access_token;
    var apiToken = '';
    if(apiToken){

      /* TRIGGER API JOURNEY ACTIVATION */
      var journey_url = rest_URL + "/interaction/v1/events";
      var journey_payload = {
        "ContactKey": email,
        "EventDefinitionKey":"APIEvent-15c8ed16-6f89-450d-4288-b106aabcfc29",
        "Data": {
          "FirstName":firstName,
          "LastName":lastName,
          "Email":email,
          "WorkshopType":workshop,
          "Consent":consent,
          "FullName":fullName,
          "JourneyEntryDate":localDate
        }
      };
      var journey_payload_String = Stringify(journey_payload);
      var journey_headerNames = ["Authorization"];
      var journey_headerValues = ["Bearer " + apiToken];
      var journey_result = HTTP.Post(journey_url, contentType, journey_payload_String, journey_headerNames, journey_headerValues);
      var journey_trigger_status = journey_result.StatusCode;
      //Write(journey_trigger_status);
      //Write("<b>Journey Response: </b>"+ Stringify(journey_result));
      if(journey_trigger_status != '201'){
        var errorCode = '401';
        var errorMessage = 'Journey failed to trigger'
        };
    }
    else{
      var errorCode = '400';
      var errorMessage = 'Invalid API Token'
      };
    if(errorCode == '0'){
      var successLog = Platform.Function.InsertDE("EventRegistrationLog",["LogID","Email","Status","Timestamp"],[logID, email, "SUCCESS", localDate]);
    }
    else{
      var errorLog = Platform.Function.InsertDE("EventRegistrationLog",["LogID","Email","Status","ErrorMessage","Timestamp"],[logID, email, "FAIL", errorMessage, localDate]);
      Variable.SetValue("@errorCode",errorCode);
    };
    //Write("<b>Access Token: </b> " + responseJSON.access_token);
  }
  catch(e) {
    // Display a user-friendly message
    Platform.Response.Write("Error Message: " + e.message + "<br>" + "Error Description: " + e.description);
  };
</script>
%%[
     ELSE
      SET @errorCode = '401'
      SET @errorMessage = 'Already submitted'
     ENDIF
   ELSE
    SET @errorCode = '400'
    SET @errorMessage = 'Please ensure all fields have been filled out.'
   ENDIF
 ENDIF
ELSE

 /* EXPIRE PAGE */
 SET @hasExpired = 'TRUE'
ENDIF

IF @errorCode > 0 THEN
 SET @formSubStatus = 'FAIL'
ELSE
 SET @formSubStatus = 'SUCCESS'
ENDIF
]%%
<b>firstName:
</b>%%=v(@firstName)=%%<br>
<b>lastName:
</b>%%=v(@lastName)=%%<br>
<b>email:
</b>%%=v(@email)=%%<br>
<b>workshop:
</b>%%=v(@workshop)=%%<br>
<b>consent:
</b>%%=v(@consent)=%%<br>
<b>action:
</b>%%=v(@action)=%%<br>
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Event Registration
    </title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f9f9f9;
        padding: 20px;
      }
      .form-container {
        max-width: 500px;
        margin: 0 auto;
        background: #ffffff;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      }
      .message-box {
        margin-bottom: 20px;
        padding: 15px;
        border-radius: 5px;
        font-weight: bold;
        text-align: center;
      }
      .success-message {
        color: #2e7d32;
      }
      .error-message {
        color: #c62828;
      }
      h2 {
        text-align: center;
        margin-bottom: 20px;
        color: #333333;
      }
      label {
        display: block;
        margin: 15px 0 5px;
        font-weight: bold;
      }
      input[type="text"],
      input[type="email"],
      input[type="tel"],
      select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
      }
      .checkbox-group {
        display: flex;
        align-items: center;
        margin-top: 10px;
      }
      .checkbox-group input[type="checkbox"] {
        margin-right: 10px;
      }
      button {
        background-color: #0070d2;
        color: white;
        padding: 12px;
        border: none;
        border-radius: 4px;
        margin-top: 20px;
        width: 100%;
        font-size: 16px;
        cursor: pointer;
      }
      button:hover {
        background-color: #005bb5;
      }
    </style>
  </head>
  <body>
    <div class="form-container">
      %%[IF @action == 'submit' THEN]%%
      %%[IF @forSubStatus == 'SUCCESS' THEN]%%
      <!-- 🔔 Message box -->
      <div class="message-box success-message">
        ✅ Your registration was successful!
      </div>
      %%[ELSE]%%
      <!-- Example of error message: -->
      <div class="message-box error-message">
        ❌ %%=IIF(NOT EMPTY(@errorMessage), @errorMessage, "An error has occured. Please contact support team")=%%
      </div>
      %%[ENDIF]%%
      %%[ENDIF]%%
      %%[IF @hasExpired == 'FALSE' THEN]%%
      <h2>Register for the Workshop
      </h2>
      <form action="%%=RequestParameter('PAGEURL')=%%" method="POST">
        <input type="hidden" id="action" name="action" value="submit">
        <label for="firstName">First Name</label>
        <input type="text" name="firstName" id="firstName" required>
        <label for="lastName">Last Name</label>
        <input type="text" name="lastName" id="lastName" required>
        <label for="email">Email Address</label>
        <input type="email" name="email" id="email" required>
        <label for="workshop">Select Workshop</label>
        <select name="workshop" id="workshop">
          <option value="">-- Select --</option>
          <option value="Marketing Automation Basics">Marketing Automation Basics</option>
          <option value="Advanced Journey Builder">Advanced Journey Builder</option>
          <option value="Data Extensions Mastery">Data Extensions Mastery</option>
        </select>
        <div class="checkbox-group">
          <input type="checkbox" name="consent" id="consent" value="TRUE" required>
          <label for="consent">I agree to receive event emails and updates</label>
        </div>
        <button type="submit">Submit Registration</button>
      </form>
      %%[ELSE]%%
      <div class="message-box error-message">
        ❌ Sorry, you no longer can register for these events.
      </div>
      %%[ENDIF]%%
    </div>
  </body>
</html>
