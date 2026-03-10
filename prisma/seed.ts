import {
    PrismaClient,
    WorkflowStatus,
    NodeKind,
    TriggerType,
    ExecutionStatus,
    StepStatus,
    LogLevel,
  } from "@prisma/client";
  
  const prisma = new PrismaClient();
  
  async function main() {
    await prisma.executionLog.deleteMany();
    await prisma.executionStep.deleteMany();
    await prisma.execution.deleteMany();
    await prisma.workflowEdge.deleteMany();
    await prisma.workflowNode.deleteMany();
    await prisma.webhookEndpoint.deleteMany();
    await prisma.scheduleTrigger.deleteMany();
    await prisma.emailTrigger.deleteMany();
    await prisma.workflow.deleteMany();
    await prisma.connection.deleteMany();
  
    const leadWorkflow = await prisma.workflow.create({
      data: {
        name: "Lead Capture Pipeline",
        description: "Принимает лид с webhook, трансформирует данные и отправляет в CRM",
        status: WorkflowStatus.ACTIVE,
        isEnabled: true,
        tags: ["sales", "webhook", "crm"],
        settings: {
          notifications: {
            onFailure: true,
            onRetry: true,
          },
        },
        canvas: {
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        },
      },
    });
  
    const triggerNode = await prisma.workflowNode.create({
      data: {
        workflowId: leadWorkflow.id,
        kind: NodeKind.TRIGGER,
        type: TriggerType.WEBHOOK,
        name: "Incoming Webhook",
        description: "Получение входящего webhook запроса",
        positionX: 100,
        positionY: 120,
        config: {
          method: "POST",
          path: "/api/hooks/lead-capture",
        },
        retryLimit: 0,
        retryDelayMs: 0,
        sortOrder: 1,
      },
    });
  
    const transformNode = await prisma.workflowNode.create({
      data: {
        workflowId: leadWorkflow.id,
        kind: NodeKind.ACTION,
        type: "TRANSFORM",
        name: "Normalize Payload",
        description: "Нормализация полей входящего payload",
        positionX: 380,
        positionY: 120,
        config: {
          mapping: {
            fullName: "{{payload.name}}",
            email: "{{payload.email}}",
            source: "{{payload.source}}",
          },
        },
        retryLimit: 1,
        retryDelayMs: 1000,
        sortOrder: 2,
      },
    });
  
    const httpNode = await prisma.workflowNode.create({
      data: {
        workflowId: leadWorkflow.id,
        kind: NodeKind.ACTION,
        type: "HTTP",
        name: "Send To CRM",
        description: "Отправка данных в внешнюю CRM систему",
        positionX: 680,
        positionY: 120,
        config: {
          method: "POST",
          url: "https://httpbin.org/post",
        },
        retryLimit: 3,
        retryDelayMs: 2000,
        timeoutMs: 10000,
        sortOrder: 3,
      },
    });
  
    await prisma.workflowEdge.createMany({
      data: [
        {
          workflowId: leadWorkflow.id,
          sourceNodeId: triggerNode.id,
          targetNodeId: transformNode.id,
        },
        {
          workflowId: leadWorkflow.id,
          sourceNodeId: transformNode.id,
          targetNodeId: httpNode.id,
        },
      ],
    });
  
    await prisma.webhookEndpoint.create({
      data: {
        workflowId: leadWorkflow.id,
        path: "lead-capture",
        secret: "lead-secret-key",
        isActive: true,
      },
    });
  
    const execution = await prisma.execution.create({
      data: {
        workflowId: leadWorkflow.id,
        status: ExecutionStatus.SUCCESS,
        triggerType: TriggerType.WEBHOOK,
        startedAt: new Date(Date.now() - 5000),
        finishedAt: new Date(),
        durationMs: 5000,
        inputPayload: {
          name: "Kirill Ivanov",
          email: "kirill@example.com",
          source: "landing-page",
        },
        outputPayload: {
          crmLeadId: "crm_123456",
          synced: true,
        },
        source: "api/hooks/lead-capture",
      },
    });
  
    const step1 = await prisma.executionStep.create({
      data: {
        executionId: execution.id,
        nodeId: triggerNode.id,
        nodeName: triggerNode.name,
        nodeType: triggerNode.type,
        status: StepStatus.SUCCESS,
        startedAt: new Date(Date.now() - 5000),
        finishedAt: new Date(Date.now() - 4500),
        durationMs: 500,
        inputPayload: {
          raw: true,
        },
        outputPayload: {
          accepted: true,
        },
      },
    });
  
    const step2 = await prisma.executionStep.create({
      data: {
        executionId: execution.id,
        nodeId: transformNode.id,
        nodeName: transformNode.name,
        nodeType: transformNode.type,
        status: StepStatus.SUCCESS,
        startedAt: new Date(Date.now() - 4300),
        finishedAt: new Date(Date.now() - 3000),
        durationMs: 1300,
        inputPayload: {
          name: "Kirill Ivanov",
        },
        outputPayload: {
          fullName: "Kirill Ivanov",
          email: "kirill@example.com",
        },
      },
    });
  
    const step3 = await prisma.executionStep.create({
      data: {
        executionId: execution.id,
        nodeId: httpNode.id,
        nodeName: httpNode.name,
        nodeType: httpNode.type,
        status: StepStatus.SUCCESS,
        startedAt: new Date(Date.now() - 2800),
        finishedAt: new Date(),
        durationMs: 2800,
        inputPayload: {
          fullName: "Kirill Ivanov",
          email: "kirill@example.com",
        },
        outputPayload: {
          status: 201,
          crmLeadId: "crm_123456",
        },
      },
    });
  
    await prisma.executionLog.createMany({
      data: [
        {
          executionId: execution.id,
          stepId: step1.id,
          level: LogLevel.INFO,
          message: "Webhook payload received",
          meta: { node: triggerNode.name },
        },
        {
          executionId: execution.id,
          stepId: step2.id,
          level: LogLevel.INFO,
          message: "Payload normalized successfully",
          meta: { node: transformNode.name },
        },
        {
          executionId: execution.id,
          stepId: step3.id,
          level: LogLevel.INFO,
          message: "Lead sent to CRM",
          meta: { node: httpNode.name, status: 201 },
        },
      ],
    });
  
    await prisma.connection.createMany({
      data: [
        {
          name: "Primary SMTP",
          type: "SMTP",
          isActive: true,
          config: {
            host: "smtp.example.com",
            port: 587,
            from: "noreply@example.com",
          },
        },
        {
          name: "Main Telegram Bot",
          type: "TELEGRAM_BOT",
          isActive: true,
          config: {
            botTokenMasked: "***",
            chatId: "123456789",
          },
        },
      ],
    });
  
    console.log("Seed completed successfully");
  }
  
  main()
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });