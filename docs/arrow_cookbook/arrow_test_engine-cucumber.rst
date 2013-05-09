Arrow Test Engine : Cucumber Integration
==============

Arrow Cucumber Test Engine provides you with a variety of tools to help you organize, execute and configure your tests with Cucumber.

First Example : Hello Java Script World
-----------------------
For more info about Cucumber, please visit <http://cukes.info>

### 1. Describe behaviour in plain text
 
In file ```features/HelloWorld.feature```,
 
```Cucumber
Feature: Hello World
    Scenario: Java Script
        Given Java Script greeting "Hello Java Script World"
    Scenario: Coffee Script
        Given Coffee Script greeting "Hello Coffee Script World"
```

### 2. Write a step definition in Java Script
 
In file ```features/step_definitions/greeting.js```,

```JavaScript
function greeting() {
}
```

### 3. Run and watch it fail

Assuming you got phantomjs running at localhost.  
Run the arrow command.

```
arrow features/HelloWorld.feature --engine=cucumber --browser=phantomjs --page=http://www.yahoo.com --logLevel=debug
```

> ...  
> [2013-05-09 16:29:35.331] [DEBUG] SeleniumDriver - Debug Messages from Browser Console :  
> [LOG] Cucumber version is 0.3.0  
> [LOG] Loaded step definitions for 0.001 seconds.  
> [LOG] Cucumber options are {"tags":["~@nodejs"]}  
> [LOG] [2013-05-09 16:29:34.882] [Cucumber] Feature: Hello World  
>   
> [LOG] [2013-05-09 16:29:34.888] [Cucumber]   Scenario: Java Script  
> [LOG] [2013-05-09 16:29:34.897] [Cucumber]     Given Java Script greeting "Hello Java Script World"  
> [LOG] [2013-05-09 16:29:34.904] [Cucumber]   
>   
> [LOG] [2013-05-09 16:29:34.909] [Cucumber]   Scenario: Coffee Script  
> [LOG] [2013-05-09 16:29:34.917] [Cucumber]     Given Coffee Script greeting "Hello Coffee Script World"  
> [LOG] [2013-05-09 16:29:34.924] [Cucumber]   
>   
> [LOG] [2013-05-09 16:29:34.931] [Cucumber]   
>   
> [LOG] [2013-05-09 16:29:34.933] [Cucumber] 2 scenarios (2 undefined)2 steps (2 undefined)  
>   
> You can implement step definitions for undefined steps with these snippets:  
>   
> this.Given(/^Java Script greeting "([^"]*)"$/, function(arg1, callback) {  
>   // express the regexp above with the code you wish you had  
>   callback.pending();  
> });  
>   
> this.Given(/^Coffee Script greeting "([^"]*)"$/, function(arg1, callback) {  
>   // express the regexp above with the code you wish you had  
>   callback.pending();  
> });  

### 4. Write code to make the step pass

In file ```features/step_definitions/greeting.js```,

```JavaScript
function greeting() {
    this.Given(/^Java Script greeting "([^"]*)"$/, function(message, callback) {
      // express the regexp above with the code you wish you had
      console.log(message);
      callback();
    });
}
```

### 5. Run again and see the step pass

To load the test with step definitions file.  
Add the --step option on arrow command.

```
arrow features/HelloWorld.feature --engine=cucumber --step=features/step_definitions/greeting.js --browser=phantomjs --page=http://www.yahoo.com --logLevel=debug
```

> ...  
> [2013-05-09 16:37:05.502] [DEBUG] SeleniumDriver - Debug Messages from Browser Console :  
> [LOG] Cucumber version is 0.3.0  
> [LOG] Loading step definitions timeout 0.091 seconds.  
> [LOG] Cucumber options are {"tags":["~@nodejs"]}  
> [LOG] [2013-05-09 16:37:05.142] [Cucumber] Feature: Hello World  
>   
> [LOG] [2013-05-09 16:37:05.148] [Cucumber]   Scenario: Java Script  
> [LOG] Hello Java Script World  
> [LOG] [2013-05-09 16:37:05.160] [Cucumber]     Given Java Script greeting "Hello Java Script World"  
> [LOG] [2013-05-09 16:37:05.170] [Cucumber]   
>   
> [LOG] [2013-05-09 16:37:05.178] [Cucumber]   Scenario: Coffee Script  
> [LOG] [2013-05-09 16:37:05.192] [Cucumber]     Given Coffee Script greeting "Hello Coffee Script World"  
> [LOG] [2013-05-09 16:37:05.205] [Cucumber]   
>   
> [LOG] [2013-05-09 16:37:05.219] [Cucumber]   
>   
> [LOG] [2013-05-09 16:37:05.223] [Cucumber] 2 scenarios (1 undefined, 1 passed)2 steps (1 undefined, 1 passed)  
>   
> You can implement step definitions for undefined steps with these snippets:  
>   
> this.Given(/^Coffee Script greeting "([^"]*)"$/, function(arg1, callback) {  
>   // express the regexp above with the code you wish you had  
>   callback.pending();  
> });  

### 6. Repeat 2-5 until green like a cuke
