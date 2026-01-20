package com.example.aimock;

import org.springframework.boot.SpringApplication;

public class TestAimockApplication {

	public static void main(String[] args) {
		SpringApplication.from(AimockApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
