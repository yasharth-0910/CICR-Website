<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = test_input($_POST["name"]);
    $email = test_input($_POST["email"]);
    $phone = test_input($_POST["phone"]);
    $query = test_input($_POST["query"]);

    $to = " "; //your email
    $subject = "New Form Submission from CICR Website";

    $message = "Name: $name\n";
    $message .= "Email: $email\n";
    $message .= "Phone: $phone\n";
    $message .= "Query: $query\n";

    mail($to, $subject, $message);

    echo "Thank you! Your form has been submitted.";
} else {
    echo "Error: Invalid request.";
}

function test_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}
?>
