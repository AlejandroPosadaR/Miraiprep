package com.example.aimock.session.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationResult {
    private BigDecimal overallScore;
    private Integer knowledge;
    private Integer communication;
    private Integer problemSolving;
    private Integer technicalDepth;
    private String feedback;
    private String strengths;
    private String areasForImprovement;
}
