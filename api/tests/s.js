process.stdout.write("aa\naaaaaa");
process.stdout.clearLine(0);
process.stdout.moveCursor(0, -1);
process.stdout.clearLine(0);
/*
process.stdout.clearLine()
process.stdout.cursorTo(0); 
process.stdout.clearLine()
process.stdout.cursorTo(0); 
process.stdout.clearLine()
*/
//process.stdout.write("\x1b[A");
