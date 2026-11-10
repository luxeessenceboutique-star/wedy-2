"""Wedy Copilot — a multi-agent system (LangChain + LangGraph).

A supervisor routes each request to specialist agents (employees, leave & requests, recruitment, documents,
performance & training, analytics, meetings & notifications). Their tools call the same handlers as the pages of the
app, so every action keeps its audit trail, notifications and webhooks. Every action that changes data is shown to the
user for confirmation first (LangGraph `interrupt`).
"""
