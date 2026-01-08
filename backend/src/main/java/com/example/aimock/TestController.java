package com.example.aimock;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @RequestMapping("/api/v1/hi")
    public String helloworld() {
        return "Hello World";
    }
}
