<?php
declare(strict_types=1);
/* Test-only bridge: excluded from the deployment bundle. Never ships to cPanel. */
if (PHP_SAPI !== 'cli-server' || getenv('OXYTOCIN_V2_TEST_MODE') !== '1') {
    http_response_code(404);
    exit;
}
session_start();
session_regenerate_id(true);
$_SESSION['admin'] = true;
header('Content-Type: text/plain; charset=utf-8');
echo 'TEST SESSION READY';
