%%[

/* ------- SET PAGE VARIABLES ------- */
SET @expiryDate = '2025-05-30' /* Set the expiry date for the form/page */
SET @systemDate = Now(1) /* Get current system date/time in UTC */
SET @localDate = SystemDateToLocalDate(@systemDate) /* Convert system UTC date to local date/time */
SET @errorCode = '0' /* Initialize error code to '0' meaning no errors yet */

/* ------- CHECK EXPIRY DATE ------- */
IF @localDate < @expiryDate THEN
  SET @hasExpired = 'FALSE' /* Page is active */

  /* ------- RETRIEVE FORM PARAMETERS ------- */
  SET @firstName = RequestParameter('firstName')
  SET @lastName = RequestParameter('lastName')
  SET @email = RequestParameter('email')
  SET @workshop = RequestParameter('workshop')
  SET @consent = RequestParameter('consent')
  SET @action = RequestParameter('action') /* Detect if form is submitted */

  /* ------- CHECK ACTION ------- */
  IF @action == 'submit' THEN

    /* ------- VALIDATE REQUIRED FIELDS ------- */
    IF NOT EMPTY(@firstName) AND NOT EMPTY(@lastName) AND NOT EMPTY(@email) AND NOT EMPTY(@workshop) AND NOT EMPTY(@consent) THEN

      /* ------- CHECK IF THE EMAIL HAS ALREADY BEEN REGISTERED ------- */
      SET @rows = LookupRows("EventRegistrationDE", "Email", @email)
      SET @rowCount = RowCount(@rows)

      /* Proceed only if no prior registration found for this email */
      IF @rowCount == 0 THEN

        /* ------- RETRIEVE ENCRYPTED API CREDENTIALS FROM DATA EXTENSION ------- */
        SET @enc_ClientID = Lookup("Enc_API_Credentials", "Client_Id", "Package_Name", "API Test Playground")
        SET @enc_ClientSecret = Lookup("Enc_API_Credentials", "Client_Secret", "Package_Name", "API Test Playground")
        SET @auth_URL = Lookup("Enc_API_Credentials", "Auth_Base_URI", "Package_Name", "API Test Playground")
        SET @rest_URL = Lookup("Enc_API_Credentials", "REST_Base_URI", "Package_Name", "API Test Playground")

        /* ------- SET 2 SYMMETRIC + 1 SALT KEY FOR DECRYPTION - BASED ON EXTERNAL KEY VALUES ------- */
        SET @sym = "35cffd94-38c3-4b58-a57d-1080f9785ca6"
        SET @IV = "1afc056b-9f6b-4e6c-b76b-d1d851c52d64"
        SET @salt = "5c797c66-7b62-4071-88eb-e530b2a415a3"

        /* ------- DECRYPT API CLIENT ID AND SECRET ------- */
        SET @dec_ClientID = DecryptSymmetric(@enc_ClientID, 'AES', @sym, @null, @salt, @null, @IV, @null)
        SET @dec_Client_Secret = DecryptSymmetric(@enc_ClientSecret, 'AES', @sym, @null, @salt, @null, @IV, @null)

]%%

<script runat="server">
  Platform.Load('Core','1'); /* Load Core library for SSJS */

  try {
    /* Retrieve decrypted credentials and URLs from AMPscript variables */
    var dec_ClientID = Variable.GetValue("@dec_ClientID");
    var dec_Client_Secret = Variable.GetValue("@dec_Client_Secret");
    var auth_URL = Variable.GetValue("@auth_URL");
    var rest_URL = Variable.GetValue("@rest_URL");
    var errorCode = '0'; /* Initialize error code */

    /* Retrieve form input variables */
    var firstName = Variable.GetValue("@firstName");
    var lastName = Variable.GetValue("@lastName");
    var email = Variable.GetValue("@email");
    var workshop = Variable.GetValue("@workshop");
    var consent = Variable.GetValue("@consent");
    var localDate = Variable.GetValue("@localDate");

    /* Combine first and last name for full name */
    var fullName = firstName + ' ' + lastName;

    /* Generate a unique GUID for logging */
    var logID = Platform.Function.GUID();

    /* ------- CONSTRUCT AUTH TOKEN REQUEST URL ------- */
    var url = auth_URL + "/v2/token";
    var contentType = "application/json";

    /* Build the payload JSON string for OAuth client credentials grant */
    var payload = '{"grant_type": "client_credentials","client_id": "' + dec_ClientID + '","client_secret": "' + dec_Client_Secret + '"}';

    /* Initialize empty arrays for headers */
    var headerNames = [];
    var headerValues = [];

    /* ------- MAKE HTTP POST REQUEST TO AUTHENTICATE AND RETRIEVE ACCESS TOKEN ------- */
    var result = HTTP.Post(url, contentType, payload, headerNames, headerValues);

    /* Parse the JSON response to extract access token */
    var responseJSON = Platform.Function.ParseJSON(result.Response[0]);
    var apiToken = responseJSON.access_token;

    // var apiToken = ''; /* Overwrites the token with an empty string to disable the journey trigger - for debugging/testing only */ 

    /* If access token received, proceed to trigger the Journey API */
    if(apiToken){

      /* ------- JOURNEY EVENT TRIGGER URL ------- */
      var journey_url = rest_URL + "/interaction/v1/events";

      /* Construct payload for triggering Journey API event */
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

      /* Convert JavaScript object (payload) into JSON string */
      var journey_payload_String = Stringify(journey_payload);

      /* Set Authorization header and Bearer token */
      var journey_headerNames = ["Authorization"];
      var journey_headerValues = ["Bearer " + apiToken];

      /* Make HTTP POST request to trigger journey event */
      var journey_result = HTTP.Post(journey_url, contentType, journey_payload_String, journey_headerNames, journey_headerValues);

      /* Capture HTTP status code from the response (Status Code 201 indicates the POST request was successful and a resource was created) */
      var journey_trigger_status = journey_result.StatusCode;

      /* If journey trigger was unsuccessful, set error code and message */
      if(journey_trigger_status != '201'){
        var errorCode = '401';
        var errorMessage = 'Journey failed to trigger';
      };
    }
    else{
      /* If no valid API token received, set error code and message */
      var errorCode = '400';
      var errorMessage = 'Invalid API Token';
    };

    /* ------- LOGGING SUCCESS OR FAILURE TO DATA EXTENSION ------- */
    if(errorCode == '0'){
      /* Insert success log entry */
      var successLog = Platform.Function.InsertDE("EventRegistrationLog",["LogID","Email","Status","Timestamp"],[logID, email, "SUCCESS", localDate]);
    }
    else{
      /* Insert failure log entry with error message */
      var errorLog = Platform.Function.InsertDE("EventRegistrationLog",["LogID","Email","Status","ErrorMessage","Timestamp"],[logID, email, "FAIL", errorMessage, localDate]);
      /* Pass the error code from SSJS to AMPscript for use later */
      Variable.SetValue("@errorCode",errorCode);
    };

  }
  catch(e) {
    /* Catch any unexpected errors and display a friendly error message */
    Platform.Response.Write("Error Message: " + e.message + "<br>" + "Error Description: " + e.description);
  };
</script>

%%[

      ELSE
        /* Email already registered - set error code and message */
        SET @errorCode = '401'
        SET @errorMessage = 'Already submitted'
      ENDIF

    ELSE
      /* Required fields missing - set error code and message */
      SET @errorCode = '400'
      SET @errorMessage = 'Please ensure all fields have been filled out.'
    ENDIF

  ENDIF /* End check for submit action */

ELSE

  /* PAGE EXPIRED - set expired flag */
  SET @hasExpired = 'TRUE'

ENDIF

/* ------- SET FORM SUBMISSION STATUS BASED ON ERROR CODE ------- */
IF @errorCode > 0 THEN
  SET @formSubStatus = 'FAIL'
ELSE
  SET @formSubStatus = 'SUCCESS'
ENDIF

]%%

<!-- ------- FORM CONTAINER ------- -->
<div class="form-container">
  <!-- ------- STATUS MESSAGES ------- -->
  %%[IF @action == 'submit' THEN]%%
    %%[IF @formSubStatus == 'SUCCESS' THEN]%%
      <!-- Display success message if registration succeeded -->
      <div class="message-box success-message">
        ✅ Your registration was successful!
      </div>
    %%[ELSE]%%
      <!-- Display error message if registration failed -->
      <div class="message-box error-message">
        ❌ %%=IIF(NOT EMPTY(@errorMessage), @errorMessage, "An error has occured. Please contact support team")=%%
      </div>
    %%[ENDIF]%%
  %%[ENDIF]%%

  %%[IF @hasExpired == 'FALSE' THEN]%%
    <!-- ------- FORM HEADER ------- -->
    <h2>Register for the Workshop</h2>

    <!-- ------- REGISTRATION FORM ------- -->
    <form action="%%=RequestParameter('PAGEURL')=%%" method="POST">
      <input type="hidden" id="action" name="action" value="submit">

      <!-- Input fields -->
      <label for="firstName">First Name</label>
      <input type="text" name="firstName" id="firstName" required>

      <label for="lastName">Last Name</label>
      <input type="text" name="lastName" id="lastName" required>

      <label for="email">Email Address</label>
      <input type="email" name="email" id="email" required>

      <label for="workshop">Select Workshop</label>
      <select name="workshop" id="workshop" required>
        <option value="">-- Select --</option>
        <option value="Marketing Automation Basics">Marketing Automation Basics</option>
        <option value="Advanced Journey Builder">Advanced Journey Builder</option>
        <option value="Data Extensions Mastery">Data Extensions Mastery</option>
      </select>

      <div class="checkbox-group">
        <input type="checkbox" name="consent" id="consent" value="TRUE" required>
        <label for="consent">I agree to receive event emails and updates</label>
      </div>

      <!-- Submit button -->
      <button type="submit">Submit Registration</button>
    </form>

  %%[ELSE]%%
    <!-- ------- EXPIRY MESSAGE ------- -->
    <div class="message-box error-message">
      ❌ Sorry, you no longer can register for these events.
    </div>
  %%[ENDIF]%%
</div>
